import { Book, BookIndex, GitHubConfig, Record as BookRecord } from '@/types';

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
  const content = atob(data.content.replace(/\n/g, ''));
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
    content: btoa(unescape(encodeURIComponent(content))),
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
    return { success: false, message: err.message || `保存失败: ${response.status}` };
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

// 保存账本
export const saveBook = async (config: GitHubConfig, book: Book): Promise<{ success: boolean; message?: string }> => {
  // 获取现有文件 SHA
  const file = await getFile(config, `data/${book.id}.json`);
  const content = JSON.stringify(book, null, 2);
  const result = await putFile(
    config,
    `data/${book.id}.json`,
    content,
    `更新账本: ${book.name}`,
    file?.sha
  );

  if (result.success) {
    // 更新索引
    await updateIndex(config, book);
  }
  return result;
};

// 更新索引
const updateIndex = async (config: GitHubConfig, book: Book): Promise<void> => {
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
  await putFile(
    config,
    'data/index.json',
    JSON.stringify(index, null, 2),
    '更新账本索引',
    indexFile?.sha
  );
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
export const addRecordToBook = async (config: GitHubConfig, bookId: string, record: Omit<BookRecord, 'id' | 'createdAt'>): Promise<{ success: boolean; record?: BookRecord; message?: string }> => {
  const book = await getBook(config, bookId);
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

export const deleteRecordFromBook = async (config: GitHubConfig, bookId: string, recordId: string): Promise<{ success: boolean; message?: string }> => {
  const book = await getBook(config, bookId);
  if (!book) {
    return { success: false, message: '账本不存在' };
  }

  book.records = book.records.filter((r) => r.id !== recordId);
  book.updatedAt = new Date().toISOString();

  return saveBook(config, book);
};