﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, BarElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Book, GitHubConfig } from '@/types';
import { getBook } from '@/utils/github';
import { getMonthKey, formatCurrency } from '@/utils/format';
import { getCategoryByName } from '@/data/categories';

ChartJS.register(ArcElement, BarElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler);

interface StatisticsPageProps {
  config: GitHubConfig;
}

export const StatisticsPage = ({ config }: StatisticsPageProps) => {
  const navigate = useNavigate();
  const { bookId = '' } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(new Date().toISOString()));
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadBook = async () => {
    if (!bookId) {
      navigate('/');
      return;
    }
    setLoading(true);
    try {
      const b = await getBook(config, bookId);
      if (b) {
        setBook(b);
        localStorage.setItem(`current_book_cache_${bookId}`, JSON.stringify(b));
      } else {
        // 尝试缓存
        const cached = localStorage.getItem(`current_book_cache_${bookId}`);
        if (cached) setBook(JSON.parse(cached));
      }
    } catch (e) {
      const cached = localStorage.getItem(`current_book_cache_${bookId}`);
      if (cached) setBook(JSON.parse(cached));
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

  if (loading || !book) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">加载中...</p>
        </div>
      </div>
    );
  }

  const months = [
    { key: 'all', label: '全部账单' },
    ...Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        key: getMonthKey(date.toISOString()),
        label: `${date.getMonth() + 1}月`,
      };
    }).reverse(),
  ];

  const monthRecords = book.records.filter((r) => (selectedMonth === 'all' || getMonthKey(r.date) === selectedMonth));

  const expenseByCategory = monthRecords
    .filter((r) => r.type === 'expense')
    .reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + r.amount;
      return acc;
    }, {} as { [key: string]: number });

  const incomeByCategory = monthRecords
    .filter((r) => r.type === 'income')
    .reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + r.amount;
      return acc;
    }, {} as { [key: string]: number });

  const expenseByMember = monthRecords
    .filter((r) => r.type === 'expense')
    .reduce((acc, r) => {
      acc[r.createdBy] = (acc[r.createdBy] || 0) + r.amount;
      return acc;
    }, {} as { [key: string]: number });

  const pieChartData = {
    labels: Object.keys(expenseByCategory),
    datasets: [{
      data: Object.values(expenseByCategory),
      backgroundColor: Object.keys(expenseByCategory).map((cat) => getCategoryByName(cat)?.color || '#0ea5e9'),
      borderWidth: 0,
      hoverOffset: 8,
    }],
  };

  const memberChartData = {
    labels: Object.keys(expenseByMember),
    datasets: [{
      label: '支出',
      data: Object.values(expenseByMember),
      backgroundColor: ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#f43f5e', '#eab308'],
      borderWidth: 0,
      borderRadius: 6,
    }],
  };

  const trendData = {
    labels: months.slice(1).map((m) => m.label),
    datasets: selectedUser === 'all' ? [
      {
        label: '收入',
        data: months.slice(1).map((m) =>
          book.records
            .filter((r) => r.type === 'income' && getMonthKey(r.date) === m.key)
            .reduce((sum, r) => sum + r.amount, 0)
        ),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: '支出',
        data: months.slice(1).map((m) =>
          book.records
            .filter((r) => r.type === 'expense' && getMonthKey(r.date) === m.key)
            .reduce((sum, r) => sum + r.amount, 0)
        ),
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ] : [
      {
        label: `${selectedUser} 的支出`,
        data: months.slice(1).map((m) =>
          book.records
            .filter((r) => r.type === 'expense' && getMonthKey(r.date) === m.key && r.participants?.includes(selectedUser))
            .reduce((sum, r) => {
              const perPerson = Math.round(r.amount / (r.participants?.length || 1) * 100) / 100;
              return sum + perPerson;
            }, 0)
        ),
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: `${selectedUser} 的收入`,
        data: months.slice(1).map((m) =>
          book.records
            .filter((r) => r.type === 'income' && getMonthKey(r.date) === m.key && r.participants?.includes(selectedUser))
            .reduce((sum, r) => {
              const perPerson = Math.round(r.amount / (r.participants?.length || 1) * 100) / 100;
              return sum + perPerson;
            }, 0)
        ),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/book/${bookId}`)}
              className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">统计分析</h1>
              <p className="text-xs text-gray-500">{book.name}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={syncing}
            className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="flex items-center justify-end gap-4">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
          >
            <option value="all">全部用户</option>
            {book.members.map((member) => (
              <option key={member.name} value={member.name}>
                {member.name}
              </option>
            ))}
          </select>
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">支出分类</h3>
            {Object.keys(expenseByCategory).length === 0 ? (
              <div className="text-center py-10 text-gray-400">暂无支出数据</div>
            ) : (
              <div className="h-72">
                <Pie data={pieChartData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right' as const,
                      labels: { padding: 15, usePointStyle: true, font: { size: 11 } },
                    },
                  },
                }} />
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">成员支出排行</h3>
            {Object.keys(expenseByMember).length === 0 ? (
              <div className="text-center py-10 text-gray-400">暂无数据</div>
            ) : (
              <div className="h-72">
                <Bar data={memberChartData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y' as const,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                    y: { grid: { display: false } },
                  },
                }} />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">月度趋势</h3>
          <div className="h-72">
            <Line data={trendData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top' as const, labels: { padding: 15, usePointStyle: true } },
              },
              scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                x: { grid: { display: false } },
              },
            }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">分类详情</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-rose-500 mb-3">支出明细</h4>
              {Object.entries(expenseByCategory).length === 0 ? (
                <p className="text-gray-400 text-sm">暂无支出</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(expenseByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amount]) => (
                      <div key={cat} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <span>{getCategoryByName(cat)?.icon || '?'}</span>
                          <span className="text-gray-700">{cat}</span>
                        </div>
                        <span className="text-rose-500 font-medium">{formatCurrency(amount as number)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium text-emerald-500 mb-3">收入明细</h4>
              {Object.entries(incomeByCategory).length === 0 ? (
                <p className="text-gray-400 text-sm">暂无收入</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(incomeByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amount]) => (
                      <div key={cat} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <span>{getCategoryByName(cat)?.icon || '?'}</span>
                          <span className="text-gray-700">{cat}</span>
                        </div>
                        <span className="text-emerald-500 font-medium">{formatCurrency(amount as number)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};