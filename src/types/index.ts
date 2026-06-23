﻿export interface Record {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
  date: string;
  createdAt: string;
  createdBy: string; // 记录创建者（管理员标识或设备名）
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

export interface Book {
  id: string; // 文件名（不含.json），也作为唯一标识
  name: string;
  description: string;
  icon: string;
  records: Record[];
  createdAt: string;
  updatedAt: string;
}

export interface BookIndex {
  books: {
    id: string;
    name: string;
    description: string;
    icon: string;
    updatedAt: string;
  }[];
}

export interface GitHubConfig {
  owner: string;       // 仓库所有者用户名
  repo: string;        // 仓库名
  token: string;       // Personal Access Token
  branch?: string;     // 分支名，默认 main
}

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'success' | 'error';
  message?: string;
  lastSync?: string;
}