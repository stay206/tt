﻿import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Search, RefreshCw, ArrowLeft, Cloud, BarChart3 } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { RecordItem } from '@/components/RecordItem';
import { AddRecordModal } from '@/components/AddRecordModal';
import { Book, GitHubConfig } from '@/types';
import { getBook, deleteRecordFromBook } from '@/utils/github';
import { getMonthKey } from '@/utils/format';

interface BookPageProps {
  config: GitHubConfig;
  deviceName: string;
}

export const BookPage = ({ config, deviceName }: BookPageProps) => {
  const navigate = useNavigate();
  const { bookId = '' } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(new Date().toISOString()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const loadBook = async () => {
    if (!bookId) {
      navigate('/');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const b = await getBook(config, bookId);
      if (b) {
        setBook(b);
        localStorage.setItem(`current_book_cache_${bookId}`, JSON.stringify(b));
      } else {
        setError('账本不存在');
      }
    } catch (e: any) {
      // 尝试用缓存
      const cached = localStorage.getItem(`current_book_cache_${bookId}`);
      if (cached) {
        setBook(JSON.parse(cached));
        setError('网络错误，已显示缓存数据');
      } else {
        setError(e.message || '加载失败');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const handleRefresh = async () => {
    setSyncing(true);
    await loadBook();
    setSyncing(false);
  };

  const handleDelete = async (id: string) => {
    if (!book) return;
    if (book.records.find(r => r.id === id)?.createdBy !== deviceName) {
      setError('只能删除自己创建的记录');
      return;
    }

    const result = await deleteRecordFromBook(config, book.id, id);
    if (result.success) {
      await loadBook();
    } else {
      setError(result.message || '删除失败');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">加载中...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || '账本不存在'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-500 text-white rounded-xl"
          >
            返回账本列表
          </button>
        </div>
      </div>
    );
  }

  const filteredRecords = book.records.filter((record) => {
    const matchesMonth = getMonthKey(record.date) === selectedMonth;
    const matchesSearch =
      record.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.createdBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMonth && matchesSearch;
  });

  const monthlyIncome = book.records
    .filter((r) => r.type === 'income' && getMonthKey(r.date) === selectedMonth)
    .reduce((sum, r) => sum + r.amount, 0);

  const monthlyExpense = book.records
    .filter((r) => r.type === 'expense' && getMonthKey(r.date) === selectedMonth)
    .reduce((sum, r) => sum + r.amount, 0);

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      key: getMonthKey(date.toISOString()),
      label: `${date.getFullYear()}年${date.getMonth() + 1}月`,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
                  <span className="text-2xl">{book.icon}</span>
                  <div>
                    <h1 className="text-lg font-bold text-gray-800">{book.name}</h1>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Cloud className="w-3 h-3" />
                      <span>云端同步</span>
                    </div>
                  </div>
                </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/statistics/${bookId}`)}
              className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl"
              title="统计分析"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={syncing}
              className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl"
              title="刷新"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">
        {error && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">本月概览</h2>
            <p className="text-gray-500 mt-1">{book.description || '查看本月收支'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                {months.map((month) => (
                  <option key={month.key} value={month.key}>
                    {month.label}
                  </option>
                ))}
              </select>
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard type="income" value={monthlyIncome} label="本月收入" />
          <StatCard type="expense" value={monthlyExpense} label="本月支出" />
          <StatCard type="balance" value={monthlyIncome - monthlyExpense} label="本月结余" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">收支记录</h3>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl">
              <div className="text-6xl mb-4">?</div>
              <p className="text-gray-500">暂无记录</p>
              <p className="text-gray-400 text-sm mt-1">点击右下角按钮添加第一条记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <RecordItem
                  key={record.id}
                  record={record}
                  onDelete={handleDelete}
                  canDelete={record.createdBy === deviceName}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 bg-primary-500 text-white p-4 rounded-full shadow-lg shadow-primary-500/40 hover:bg-primary-600 transition-all active:scale-95 z-40"
      >
        <span className="text-2xl">+</span>
      </button>

      <AddRecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={loadBook}
        config={config}
        bookId={bookId}
        deviceName={deviceName}
      />
    </div>
  );
};