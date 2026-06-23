﻿import { Category } from '@/types';

export const defaultCategories: Category[] = [
  { id: '1', name: '餐饮', type: 'expense', icon: '?', color: '#ef4444' },
  { id: '2', name: '交通', type: 'expense', icon: '?', color: '#3b82f6' },
  { id: '3', name: '购物', type: 'expense', icon: '??', color: '#ec4899' },
  { id: '4', name: '娱乐', type: 'expense', icon: '?', color: '#8b5cf6' },
  { id: '5', name: '医疗', type: 'expense', icon: '?', color: '#10b981' },
  { id: '6', name: '教育', type: 'expense', icon: '?', color: '#f59e0b' },
  { id: '7', name: '房租', type: 'expense', icon: '?', color: '#6366f1' },
  { id: '8', name: '水电', type: 'expense', icon: '?', color: '#06b6d4' },
  { id: '9', name: '工资', type: 'income', icon: '?', color: '#22c55e' },
  { id: '10', name: '奖金', type: 'income', icon: '?', color: '#eab308' },
  { id: '11', name: '投资', type: 'income', icon: '?', color: '#84cc16' },
  { id: '12', name: '兼职', type: 'income', icon: '?', color: '#0ea5e9' },
  { id: '13', name: '其他', type: 'income', icon: '?', color: '#f97316' },
];

export const getCategoriesByType = (type: 'income' | 'expense'): Category[] => {
  return defaultCategories.filter(cat => cat.type === type);
};

export const getCategoryByName = (name: string): Category | undefined => {
  return defaultCategories.find(cat => cat.name === name);
};