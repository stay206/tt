﻿﻿﻿﻿﻿﻿﻿﻿export interface Record {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
  date: string;
  createdAt: string;
  createdBy: string; // 记录创建者（管理员标识或设备名）
  payer: string; // 付款人
  participants: string[]; // 参与成员（平分此次支出的人）
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

export interface BookMember {
  name: string;
  addedAt: string;
}

export interface Book {
  id: string; // 文件名（不含.json），也作为唯一标识
  name: string;
  description: string;
  icon: string;
  records: Record[];
  members: BookMember[]; // 账本成员列表
  password?: string; // 账本密码（哈希后）
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
  id: string;           // 配置唯一标识
  name: string;         // 配置名称（如"我的账本"、"龙的账本"）
  owner: string;       // 仓库所有者用户名
  repo: string;        // 仓库名
  token: string;       // Personal Access Token
  branch?: string;     // 分支名，默认 main
  isOwner?: boolean;   // 是否是仓库所有者
  addedAt?: string;    // 添加时间
}

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'success' | 'error';
  message?: string;
  lastSync?: string;
}