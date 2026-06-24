import { Book, GitHubConfig } from '@/types';
import { getBook, saveBook, addRecordToBook, deleteRecordFromBook } from './github';

const QUEUE_KEY = 'expense_tracker_offline_queue';
const SYNC_STATUS_KEY = 'expense_tracker_sync_status';

export interface QueueOperation {
  id: string;
  type: 'add_record' | 'delete_record' | 'edit_record' | 'add_member' | 'delete_member' | 'update_book';
  bookId: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface SyncStatus {
  lastSync: number;
  pendingCount: number;
  isSyncing: boolean;
  lastError?: string;
}

// ��ȡ��������
export const getQueue = (): QueueOperation[] => {
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// �����������
const saveQueue = (queue: QueueOperation[]): void => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

// ��ȡͬ��״̬
export const getSyncStatus = (): SyncStatus => {
  try {
    const data = localStorage.getItem(SYNC_STATUS_KEY);
    return data ? JSON.parse(data) : { lastSync: 0, pendingCount: 0, isSyncing: false };
  } catch {
    return { lastSync: 0, pendingCount: 0, isSyncing: false };
  }
};

// ����ͬ��״̬
const saveSyncStatus = (status: SyncStatus): void => {
  localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
};

// ���Ӳ���������
export const addToQueue = (operation: Omit<QueueOperation, 'id' | 'timestamp' | 'retryCount'>): void => {
  const queue = getQueue();
  const newOp: QueueOperation = {
    ...operation,
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
    timestamp: Date.now(),
    retryCount: 0,
  };
  queue.push(newOp);
  saveQueue(queue);
  updateSyncStatus();
};

// �Ӷ������Ƴ�����
const removeFromQueue = (operationId: string): void => {
  const queue = getQueue().filter(op => op.id !== operationId);
  saveQueue(queue);
  updateSyncStatus();
};

// ����ͬ��״̬
const updateSyncStatus = (): void => {
  const queue = getQueue();
  const status = getSyncStatus();
  status.pendingCount = queue.length;
  saveSyncStatus(status);
};

// Ӧ�ñ��ض��е��˱�����
export const applyQueueToBook = (book: Book): Book => {
  const queue = getQueue().filter(op => op.bookId === book.id);
  if (queue.length === 0) return book;

  const updatedBook = { ...book, records: [...book.records] };

  // ��ʱ��˳��Ӧ�ò���
  queue.sort((a, b) => a.timestamp - b.timestamp);

  queue.forEach(op => {
    switch (op.type) {
      case 'add_record':
        updatedBook.records.unshift(op.data);
        break;
      case 'delete_record':
        updatedBook.records = updatedBook.records.filter(r => r.id !== op.data.recordId);
        break;
      case 'edit_record': {
        const idx = updatedBook.records.findIndex(r => r.id === op.data.id);
        if (idx !== -1) {
          updatedBook.records[idx] = { ...updatedBook.records[idx], ...op.data };
        }
        break;
      }
      case 'add_member':
        if (!updatedBook.members.some(m => m.name === op.data.name)) {
          updatedBook.members.push(op.data);
        }
        break;
      case 'delete_member':
        updatedBook.members = updatedBook.members.filter(m => m.name !== op.data.name);
        break;
      case 'update_book':
        Object.assign(updatedBook, op.data);
        break;
    }
  });

  return updatedBook;
};

// ͬ�����е� GitHub
export const syncQueue = async (config: GitHubConfig): Promise<{ success: boolean; message?: string }> => {
  const status = getSyncStatus();
  if (status.isSyncing) {
    return { success: false, message: '����ͬ����' };
  }

  const queue = getQueue();
  if (queue.length === 0) {
    return { success: true, message: 'û�д�ͬ���Ĳ���' };
  }

  status.isSyncing = true;
  status.lastError = undefined;
  saveSyncStatus(status);

  const failedOps: QueueOperation[] = [];

  for (const op of queue) {
    try {
      let result;
      switch (op.type) {
        case 'add_record':
          result = await addRecordToBook(config, op.bookId, op.data);
          break;
        case 'delete_record':
          result = await deleteRecordFromBook(config, op.bookId, op.data.recordId);
          break;
        case 'edit_record': {
          const book = await getBook(config, op.bookId);
          if (book) {
            const idx = book.records.findIndex(r => r.id === op.data.id);
            if (idx !== -1) {
              book.records[idx] = { ...book.records[idx], ...op.data };
              book.updatedAt = new Date().toISOString();
              result = await saveBook(config, book);
            } else {
              result = { success: false, message: '��¼������' };
            }
          } else {
            result = { success: false, message: '�˱�������' };
          }
          break;
        }
        case 'add_member':
        case 'delete_member':
        case 'update_book': {
          const cached = localStorage.getItem(`current_book_cache_${op.bookId}`);
          let book = await getBook(config, op.bookId);
          if (!book && cached) {
            try {
              book = JSON.parse(cached);
            } catch {}
          }
          if (book) {
            const updatedBook = applyQueueToBook(book);
            result = await saveBook(config, updatedBook);
          } else {
            result = { success: false, message: '�˱�������' };
          }
          break;
        }
        default:
          result = { success: false, message: 'δ֪��������' };
      }

      if (result.success) {
        removeFromQueue(op.id);
      } else {
        op.retryCount++;
        if (op.retryCount >= 3) {
          removeFromQueue(op.id);
        } else {
          failedOps.push(op);
        }
      }
    } catch (e: any) {
      op.retryCount++;
      if (op.retryCount >= 3) {
        removeFromQueue(op.id);
      } else {
        failedOps.push(op);
      }
    }
  }

  status.isSyncing = false;
  status.lastSync = Date.now();
  if (failedOps.length > 0) {
    status.lastError = `${failedOps.length} ������ͬ��ʧ��`;
  }
  saveSyncStatus(status);

  if (failedOps.length > 0) {
    return { success: false, message: `${failedOps.length} ������ͬ��ʧ�ܣ������� ${failedOps[0].retryCount} ��` };
  }
  return { success: true, message: 'ͬ�����' };
};

// 清空队列
export const clearQueue = (): void => {
  localStorage.removeItem(QUEUE_KEY);
  updateSyncStatus();
};

let autoSyncTimer: ReturnType<typeof setTimeout> | null = null;

export const startAutoSync = (config: GitHubConfig, onSuccess?: () => void, onError?: (error: string) => void): void => {
  if (autoSyncTimer) {
    clearTimeout(autoSyncTimer);
  }

  const runSync = async () => {
    try {
      const status = getSyncStatus();
      if (status.isSyncing) {
        scheduleNext();
        return;
      }

      const queue = getQueue();
      if (queue.length > 0) {
        const result = await syncQueue(config);
        if (result.success) {
          onSuccess?.();
        } else {
          onError?.(result.message || '同步失败');
        }
      }
    } catch (e: any) {
      onError?.(e.message || '同步失败');
    } finally {
      scheduleNext();
    }
  };

  const scheduleNext = () => {
    const queue = getQueue();
    const delay = queue.length > 0 ? 3000 : 15000;
    autoSyncTimer = setTimeout(runSync, delay);
  };

  runSync();
};

export const stopAutoSync = (): void => {
  if (autoSyncTimer) {
    clearTimeout(autoSyncTimer);
    autoSyncTimer = null;
  }
};
