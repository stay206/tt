﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { Book, BookIndex, GitHubConfig, Record as BookRecord } from '@/types';

const GITHUB_API = 'https://api.github.com';
const GITHUB_CONFIG_KEY = 'expense_tracker_github_config';
const DEVICE_NAME_KEY = 'expense_tracker_device_name';

export const getGitHubConfig = (): GitHubConfig | null => {
  try {
    const data = localStorage.getItem(GITHUB_CONFIG_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setGitHubConfig = (config: GitHubConfig | null): void => {
  if (config) {
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
  } else {
    localStorage.removeItem(GITHUB_CONFIG_KEY);
  }
};

export const getDeviceName = (): string => {
  let name = localStorage.getItem(DEVICE_NAME_KEY);
  if (!name) {
    // 自动生成设备名
    const random = Math.random().toString(36).substring(2, 6);
    name = `用户${random}`;
    localStorage.setItem(DEVICE_NAME_KEY, name);
  }
  return name;
};

export const setDeviceName = (name: string): void => {
  localStorage.setItem(DEVICE_NAME_KEY, name);
};

const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const testConnection = async (config: GitHubConfig): Promise<{ success: boolean; message?: string; isPublic?: boolean }> => {
  try {
    // 尝试读取仓库信息
    const response = await fetch(`${GITHUB_API}/repos/${config.owner}/${config.repo}`, {
      headers: getHeaders(config.token),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, message: '仓库不存在或无权访问' };
      }
      if (response.status === 401) {
        return { success: false, message: 'Token 无效' };
      }
      return { success: false, message: `访问失败: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, isPublic: !data.private };
  } catch (e) {
    return { success: false, message: '网络错误' };
  }
};

interface RepoFileResponse {
  content: string;
  encoding: string;
  sha: string;
  name: string;
}

const getFile = async (config: GitHubConfig, path: string): Promise<{ content: string; sha: string } | null> => {
  const branch = config.branch || 'main';
  const response = await fetch(
    `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${path}?ref=${branch}`,
    { headers: getHeaders(config.token) }
  );

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`读取失败: ${response.status}`);
  }

  const data: RepoFileResponse = await response.json();
  const binary = atob(data.content.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i) & 0xFF;
  }
  const content = new TextDecoder('utf-8').decode(bytes);
  return { content, sha: data.sha };
};

const putFile = async (
  config: GitHubConfig,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<{ success: boolean; message?: string }> => {
  const branch = config.branch || 'main';
  const body: any = {
    message,
    content: btoa(String.fromCharCode(...new TextEncoder().encode(content))),
    branch,
  };
  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(
    `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: getHeaders(config.token),
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const errMessage = err.message || `保存失败: ${response.status}`;
    // 检查是否是 SHA 冲突错误
    if (errMessage.includes('SHA') || response.status === 409) {
      return { success: false, message: 'SHA conflict' };
    }
    return { success: false, message: errMessage };
  }
  return { success: true };
};

// 读取账本索引
export const getBookIndex = async (config: GitHubConfig): Promise<BookIndex> => {
  const file = await getFile(config, 'data/index.json');
  if (!file) {
    return { books: [] };
  }
  try {
    return JSON.parse(file.content);
  } catch {
    return { books: [] };
  }
};

// 读取单个账本
export const getBook = async (config: GitHubConfig, bookId: string): Promise<Book | null> => {
  const file = await getFile(config, `data/${bookId}.json`);
  if (!file) return null;
  try {
    return JSON.parse(file.content);
  } catch {
    return null;
  }
};

export const saveBook = async (config: GitHubConfig, book: Book, retryCount = 3): Promise<{ success: boolean; message?: string }> => {
  const content = JSON.stringify(book, null, 2);
  
  for (let i = 0; i < retryCount; i++) {
    const file = await getFile(config, `data/${book.id}.json`);
    const sha = file?.sha;
    
    const result = await putFile(
      config,
      `data/${book.id}.json`,
      content,
      `更新账本: ${book.name}`,
      sha
    );

    if (result.success) {
      await updateIndex(config, book);
      return result;
    }
    
    // 如果是因为 SHA 冲突失败，等待一小段时间后重试
    if (result.message?.includes('SHA')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }
    
    // 如果不是 SHA 问题，且文件不存在，尝试创建
    if (!sha) {
      const retryResult = await putFile(
        config,
        `data/${book.id}.json`,
        content,
        `创建账本: ${book.name}`
      );
      if (retryResult.success) {
        await updateIndex(config, book);
        return retryResult;
      }
    }
    
    return result;
  }
  
  return { success: false, message: '保存失败：并发冲突，请重试' };
};

// 更新索引
const updateIndex = async (config: GitHubConfig, book: Book, retryCount = 3): Promise<void> => {
  for (let i = 0; i < retryCount; i++) {
    const index = await getBookIndex(config);
    const existingIdx = index.books.findIndex((b) => b.id === book.id);

    const summary = {
      id: book.id,
      name: book.name,
      description: book.description,
      icon: book.icon,
      updatedAt: book.updatedAt,
    };

    if (existingIdx !== -1) {
      index.books[existingIdx] = summary;
    } else {
      index.books.push(summary);
    }

    const indexFile = await getFile(config, 'data/index.json');
    const result = await putFile(
      config,
      'data/index.json',
      JSON.stringify(index, null, 2),
      '更新账本索引',
      indexFile?.sha
    );

    if (result.success) return;
    
    // 如果失败，等待后重试
    await new Promise(resolve => setTimeout(resolve, 300));
  }
};

// 重置所有数据（清理乱码）
export const resetAllData = async (config: GitHubConfig): Promise<{ success: boolean; message?: string }> => {
  try {
    const indexFile = await getFile(config, 'data/index.json');
    const emptyIndex = { books: [] };
    const result = await putFile(
      config,
      'data/index.json',
      JSON.stringify(emptyIndex, null, 2),
      '重置账本索引',
      indexFile?.sha
    );
    return result;
  } catch (e: any) {
    return { success: false, message: e.message || '重置失败' };
  }
};

// 删除账本
export const deleteBookFile = async (config: GitHubConfig, bookId: string): Promise<{ success: boolean; message?: string }> => {
  const file = await getFile(config, `data/${bookId}.json`);
  if (!file) {
    return { success: false, message: '账本不存在' };
  }

  const branch = config.branch || 'main';
  const response = await fetch(
    `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/data/${bookId}.json`,
    {
      method: 'DELETE',
      headers: getHeaders(config.token),
      body: JSON.stringify({
        message: `删除账本: ${bookId}`,
        sha: file.sha,
        branch,
      }),
    }
  );

  if (!response.ok) {
    return { success: false, message: `删除失败: ${response.status}` };
  }

  // 从索引中移除
  const index = await getBookIndex(config);
  index.books = index.books.filter((b) => b.id !== bookId);
  const indexFile = await getFile(config, 'data/index.json');
  await putFile(
    config,
    'data/index.json',
    JSON.stringify(index, null, 2),
    '更新账本索引',
    indexFile?.sha
  );

  return { success: true };
};

// 添加记录
export const addRecordToBook = async (config: GitHubConfig, bookId: string, record: Omit<BookRecord, 'id' | 'createdAt'>, existingBook?: Book): Promise<{ success: boolean; record?: BookRecord; message?: string }> => {
  const book = existingBook || await getBook(config, bookId);
  if (!book) {
    return { success: false, message: '账本不存在' };
  }

  const newRecord: BookRecord = {
    ...record,
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
    createdAt: new Date().toISOString(),
  };

  book.records.unshift(newRecord);
  book.updatedAt = new Date().toISOString();

  const result = await saveBook(config, book);
  if (result.success) {
    return { success: true, record: newRecord };
  }
  return { success: false, message: result.message };
};

export const deleteRecordFromBook = async (config: GitHubConfig, bookId: string, recordId: string, existingBook?: Book): Promise<{ success: boolean; message?: string }> => {
  const book = existingBook || await getBook(config, bookId);
  if (!book) {
    return { success: false, message: '账本不存在' };
  }

  book.records = book.records.filter((r) => r.id !== recordId);
  book.updatedAt = new Date().toISOString();

  return saveBook(config, book);
};