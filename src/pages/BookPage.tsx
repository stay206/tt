import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Search, RefreshCw, ArrowLeft, Cloud, BarChart3, Users, UserPlus, Edit2 } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { AddRecordModal } from '@/components/AddRecordModal';
import { Book, GitHubConfig, BookMember, Record as BookRecord } from '@/types';
import { getBook, saveBook } from '@/utils/github';
import { getMonthKey } from '@/utils/format';
import { getCategoriesByType } from '@/data/categories';

interface BookPageProps {
  config: GitHubConfig;
  deviceName: string;
}

// 计算结余：每个人应该支付/收到的金额
const calculateBalances = (records: BookRecord[], members: BookMember[]) => {
  const balances: Record<string, number> = {};
  members.forEach(m => balances[m.name] = 0);

  records.filter(r => r.type === 'expense' && r.participants && r.participants.length > 0).forEach(record => {
    const perPerson = Math.round(record.amount / record.participants.length * 100) / 100;
    // 付款人支出全额，但只需承担自己的份额
    if (balances[record.payer] !== undefined) {
      balances[record.payer] -= record.amount;
      if (record.participants.includes(record.payer)) {
        balances[record.payer] += perPerson;
      }
    }
    // 其他参与者需承担份额
    record.participants.forEach(p => {
      if (p !== record.payer && balances[p] !== undefined) {
        balances[p] += perPerson;
      }
    });
  });

  return balances;
};

export const BookPage = ({ config, deviceName }: BookPageProps) => {
  const navigate = useNavigate();
  const { bookId = '' } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(new Date().toISOString()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<BookRecord | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
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
        // 确保 members 字段存在
        if (!b.members) b.members = [];
        setBook(b);
        localStorage.setItem(`current_book_cache_${bookId}`, JSON.stringify(b));
      } else {
        setError('账本不存在');
      }
    } catch (e: any) {
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

  const handleAddMember = async () => {
    if (!book || !newMemberName.trim()) return;
    const exists = book.members.some(m => m.name === newMemberName.trim());
    if (exists) {
      setError('成员已存在');
      return;
    }

    const updatedBook: Book = {
      ...book,
      members: [...book.members, { name: newMemberName.trim(), addedAt: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    };

    const result = await saveBook(config, updatedBook);
    if (result.success) {
      setBook(updatedBook);
      setNewMemberName('');
      setShowMembers(false);
    } else {
      setError(result.message || '添加失败');
    }
  };

  const handleDeleteMember = async (name: string) => {
    if (!book) return;
    if (!window.confirm(`确定要删除成员「${name}」吗？`)) return;

    const updatedBook: Book = {
      ...book,
      members: book.members.filter(m => m.name !== name),
      updatedAt: new Date().toISOString(),
    };

    const result = await saveBook(config, updatedBook);
    if (result.success) {
      setBook(updatedBook);
    } else {
      setError(result.message || '删除失败');
    }
  };

  const handleEditRecord = (record: BookRecord) => {
    setEditRecord(record);
    setIsModalOpen(true);
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
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary-500 text-white rounded-xl">
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

  // 本月总支出
  const monthlyTotalExpense = book.records
    .filter((r) => r.type === 'expense' && getMonthKey(r.date) === selectedMonth)
    .reduce((sum, r) => sum + r.amount, 0);

  // 本月个人支出（当前用户参与的支出）
  const monthlyPersonalExpense = book.records
    .filter((r) => r.type === 'expense' && getMonthKey(r.date) === selectedMonth && r.participants?.includes(deviceName))
    .reduce((sum, r) => {
      const perPerson = Math.round(r.amount / (r.participants?.length || 1) * 100) / 100;
      return sum + perPerson;
    }, 0);

  // 本月收入
  const monthlyIncome = book.records
    .filter((r) => r.type === 'income' && getMonthKey(r.date) === selectedMonth)
    .reduce((sum, r) => sum + r.amount, 0);

  // 计算结余
  const balances = calculateBalances(book.records.filter(r => getMonthKey(r.date) === selectedMonth), book.members);
  const myBalance = balances[deviceName] || 0;

  // 找出应该支付给谁
  const settlements: { from: string; to: string; amount: number }[] = [];
  const positiveBalances = Object.entries(balances).filter(([_, b]) => b > 0);
  const negativeBalances = Object.entries(balances).filter(([_, b]) => b < 0);

  negativeBalances.forEach(([payer, debt]) => {
    positiveBalances.forEach(([receiver, credit]) => {
      if (debt < 0 && credit > 0) {
        const amount = Math.min(-debt, credit);
        if (amount > 0.01) {
          settlements.push({ from: payer, to: receiver, amount: Math.round(amount * 100) / 100 });
        }
      }
    });
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return { key: getMonthKey(date.toISOString()), label: `${date.getFullYear()}年${date.getMonth() + 1}月` };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl">
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
            <button onClick={() => setShowMembers(true)} className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl" title="成员管理">
              <Users className="w-5 h-5" />
            </button>
            <button onClick={() => navigate(`/statistics/${bookId}`)} className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl" title="统计分析">
              <BarChart3 className="w-5 h-5" />
            </button>
            <button onClick={handleRefresh} disabled={syncing} className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl" title="刷新">
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
                  <option key={month.key} value={month.key}>{month.label}</option>
                ))}
              </select>
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard type="income" value={monthlyIncome} label="本月收入" />
          <StatCard type="expense" value={monthlyTotalExpense} label="本月总支出" />
          <StatCard type="expense" value={monthlyPersonalExpense} label="我的支出" />
        </div>

        {/* 结余显示 */}
        {book.members.length > 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">账单结余</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl ${myBalance > 0 ? 'bg-emerald-50' : myBalance < 0 ? 'bg-rose-50' : 'bg-gray-50'}`}>
                <p className="text-sm text-gray-500">我的结余</p>
                <p className={`text-xl font-bold ${myBalance > 0 ? 'text-emerald-600' : myBalance < 0 ? 'text-rose-600' : 'text-gray-600'}`}>
                  {myBalance > 0 ? `应收 ¥${myBalance.toFixed(2)}` : myBalance < 0 ? `应付 ¥${(-myBalance).toFixed(2)}` : '¥0.00'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-2">结算建议</p>
                {settlements.filter(s => s.from === deviceName || s.to === deviceName).length > 0 ? (
                  <div className="space-y-1">
                    {settlements.filter(s => s.from === deviceName || s.to === deviceName).map((s, i) => (
                      <p key={i} className="text-sm">
                        {s.from === deviceName ? `应付给 ${s.to}` : `${s.from} 应付给你`}：¥{s.amount.toFixed(2)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">无需结算</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">收支记录</h3>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-500">暂无记录</p>
              <p className="text-gray-400 text-sm mt-1">点击右下角按钮添加第一条记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <div key={record.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: record.type === 'expense' ? 'rgba(239, 68, 68, 0.125)' : 'rgba(16, 185, 129, 0.125)' }}>
                        {getCategoriesByType(record.type).find(c => c.name === record.category)?.icon || '📝'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800">{record.category}</span>
                          {record.payer && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{record.payer}付</span>}
                          {record.participants && record.participants.length > 1 && (
                            <span className="text-xs text-primary-500 bg-primary-50 px-2 py-0.5 rounded">
                              {record.participants.length}人平分
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{record.date} {record.note && `· ${record.note}`}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-lg font-bold ${record.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {record.type === 'expense' ? '-' : '+'}¥{record.amount.toFixed(2)}
                      </div>
                      <button onClick={() => handleEditRecord(record)} className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <button onClick={() => { setEditRecord(null); setIsModalOpen(true); }}
        className="fixed bottom-20 md:bottom-6 right-6 bg-primary-500 text-white p-4 rounded-full shadow-lg shadow-primary-500/40 hover:bg-primary-600 transition-all active:scale-95 z-40">
        <span className="text-2xl">+</span>
      </button>

      <AddRecordModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditRecord(null); }}
        onAdd={loadBook}
        config={config}
        bookId={bookId}
        deviceName={deviceName}
        book={book}
        editRecord={editRecord}
      />

      {/* 成员管理弹窗 */}
      {showMembers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">成员管理</h2>
              <button onClick={() => setShowMembers(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="输入成员名称"
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button onClick={handleAddMember} disabled={!newMemberName.trim()} className="px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium disabled:opacity-50">
                  <UserPlus className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                {book.members.map((member) => (
                  <div key={member.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-800">{member.name}</span>
                    {member.name !== deviceName && (
                      <button onClick={() => handleDeleteMember(member.name)} className="text-rose-500 hover:text-rose-600 text-sm">
                        删除
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">成员可以参与账单平分，添加记录时选择参与成员</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};