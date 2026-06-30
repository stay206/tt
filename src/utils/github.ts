﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { Book, BookIndex, GitHubConfig, Record as BookRecord } from '@/types';

const GITHUB_API = 'https://api.github.com';
const GITHUB_CONFIG_KEY = 'expense_tracker_github_config';
const GITHUB_CONFIGS_KEY = 'expense_tracker_github_configs';
const CURRENT_CONFIG_ID_KEY = 'expense_tracker_current_config_id';
const DEVICE_NAME_KEY = 'expense_tracker_device_name';

// 获取所有GitHub配置（多仓库）
export const getAllGitHubConfigs = (): GitHubConfig[] => {
  try {
    const data = localStorage.getItem(GITHUB_CONFIGS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // 迁移旧配置
    const oldConfig = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (oldConfig) {
      const config = JSON.parse(oldConfig);
      const migratedConfig: GitHubConfig = {
        id: `config_${Date.now()}`,
        name: config.repo || '默认',
        owner: config.owner,
        repo: config.repo,
        token: config.token,
        branch: config.branch || 'main',
        isOwner: true,
        addedAt: new Date().toISOString(),
      };
      localStorage.setItem(GITHUB_CONFIGS_KEY, JSON.stringify([migratedConfig]));
      localStorage.setItem(CURRENT_CONFIG_ID_KEY, migratedConfig.id);
      localStorage.removeItem(GITHUB_CONFIG_KEY);
      return [migratedConfig];
    }
    return [];
  } catch {
    return [];
  }
};

// 保存所有GitHub配置
export const saveAllGitHubConfigs = (configs: GitHubConfig[]): void => {
  localStorage.setItem(GITHUB_CONFIGS_KEY, JSON.stringify(configs));
};

// 添加GitHub配置
export const addGitHubConfig = (config: Omit<GitHubConfig, 'id' | 'addedAt'> & { id?: string }): GitHubConfig => {
  const configs = getAllGitHubConfigs();
  
  // 检查是否已存在相同的仓库（owner + repo + branch 相同）
  const existing = configs.find(c => 
    c.owner === config.owner && c.repo === config.repo && (c.branch || 'main') === (config.branch || 'main')
  );
  if (existing) {
    // 如果已有token但新配置没有token，保留原有token；如果新配置有token，更新token
    if (config.token && !existing.token) {
      existing.token = config.token;
      existing.isOwner = config.isOwner;
      saveAllGitHubConfigs(configs);
    }
    if (!getCurrentConfigId()) {
      setCurrentConfigId(existing.id);
    }
    return existing;
  }
  
  const newConfig: GitHubConfig = {
    ...config,
    id: config.id || `config_${Date.now()}`,
    addedAt: new Date().toISOString(),
  };
  configs.push(newConfig);
  saveAllGitHubConfigs(configs);
  if (!getCurrentConfigId()) {
    setCurrentConfigId(newConfig.id);
  }
  return newConfig;
};

// 清理 localStorage 中重复的仓库配置（按 owner+repo+branch 分组，保留第一个）
export const cleanDuplicateConfigs = (): number => {
  const configs = getAllGitHubConfigs();
  if (configs.length <= 1) return 0;
  
  const seen = new Set<string>();
  const cleaned: GitHubConfig[] = [];
  let removed = 0;
  
  for (const config of configs) {
    const key = `${config.owner}/${config.repo}#${config.branch || 'main'}`;
    if (seen.has(key)) {
      removed++;
    } else {
      seen.add(key);
      cleaned.push(config);
    }
  }
  
  if (removed > 0) {
    saveAllGitHubConfigs(cleaned);
    // 确保当前配置仍然存在
    const currentId = getCurrentConfigId();
    if (currentId && !cleaned.find(c => c.id === currentId)) {
      setCurrentConfigId(cleaned[0]?.id || '');
    }
  }
  
  return removed;
};

// 删除GitHub配置
export const removeGitHubConfig = (configId: string): void => {
  const configs = getAllGitHubConfigs().filter(c => c.id !== configId);
  saveAllGitHubConfigs(configs);
  if (getCurrentConfigId() === configId) {
    setCurrentConfigId(configs[0]?.id || '');
  }
};

// 获取当前选中的配置ID
export const getCurrentConfigId = (): string => {
  return localStorage.getItem(CURRENT_CONFIG_ID_KEY) || '';
};

// 设置当前选中的配置ID
export const setCurrentConfigId = (id: string): void => {
  localStorage.setItem(CURRENT_CONFIG_ID_KEY, id);
};

// 获取当前GitHub配置
export const getGitHubConfig = (): GitHubConfig | null => {
  const configs = getAllGitHubConfigs();
  const currentId = getCurrentConfigId();
  return configs.find(c => c.id === currentId) || configs[0] || null;
};

// 设置当前GitHub配置（向后兼容）- 按 owner+repo+branch 去重
export const setGitHubConfig = (config: GitHubConfig | null): void => {
  if (config) {
    const configs = getAllGitHubConfigs();
    // 先按 owner+repo+branch 查找已存在的配置
    const branchKey = config.branch || 'main';
    const existingIdx = configs.findIndex(c =>
      c.owner === config.owner &&
      c.repo === config.repo &&
      (c.branch || 'main') === branchKey
    );
    if (existingIdx !== -1) {
      // 已存在，保留原 id，合并配置（用新值覆盖空值）
      const existing = configs[existingIdx];
      configs[existingIdx] = {
        ...existing,
        ...config,
        id: existing.id, // 保留原 id
        addedAt: existing.addedAt, // 保留原添加时间
        // 如果新配置有 token 但旧配置没有，更新 token
        token: config.token || existing.token,
        // 如果新配置有 isOwner 信息，更新
        isOwner: config.isOwner ?? existing.isOwner,
      };
      saveAllGitHubConfigs(configs);
      setCurrentConfigId(existing.id);
    } else {
      configs.push(config);
      saveAllGitHubConfigs(configs);
      setCurrentConfigId(config.id);
    }
  } else {
    // 清空所有配置
    saveAllGitHubConfigs([]);
    setCurrentConfigId('');
  }
};

export const getDeviceName = (): string => {
  let name = localStorage.getItem(DEVICE_NAME_KEY);
  if (!name) {
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

export const testConnection = async (config: GitHubConfig): Promise<{ success: boolean; message?: string; isPublic?: boolean; ownerName?: string }> => {
  try {
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
    return { success: true, isPublic: !data.private, ownerName: data.owner?.login || config.owner };
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
  let content = new TextDecoder('utf-8').decode(bytes);
  content = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
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

export const getLatestRelease = async (owner: string, repo: string): Promise<{ version: string; downloadUrl: string; body: string } | null> => {
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/releases/latest`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const apkAsset = data.assets?.find((a: any) => a.name?.endsWith('.apk'));
    
    return {
      version: data.tag_name?.replace(/^v/, '') || '',
      downloadUrl: apkAsset?.browser_download_url || data.html_url || '',
      body: data.body || '',
    };
  } catch {
    return null;
  }
};

export const compareVersions = (current: string, latest: string): boolean => {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const cur = currentParts[i] || 0;
    const lat = latestParts[i] || 0;
    if (lat > cur) return true;
    if (lat < cur) return false;
  }
  return false;
};

const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

export const hashPassword = (password: string): string => {
  const salt = 'bangumi_salt_2026';
  return simpleHash(salt + password + salt);
};

export const verifyPassword = (password: string, hash: string): boolean => {
  return hashPassword(password) === hash;
};

export const getBookPasswordVerified = (bookId: string): boolean => {
  return localStorage.getItem(`book_password_verified_${bookId}`) === 'true';
};

export const setBookPasswordVerified = (bookId: string, verified: boolean): void => {
  if (verified) {
    localStorage.setItem(`book_password_verified_${bookId}`, 'true');
  } else {
    localStorage.removeItem(`book_password_verified_${bookId}`);
  }
};