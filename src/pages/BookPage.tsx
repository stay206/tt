﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Search, RefreshCw, ArrowLeft, Cloud, BarChart3, Users, UserPlus, Edit2, Trash2, X, Share2, Copy } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { AddRecordModal } from '@/components/AddRecordModal';
import { Book, GitHubConfig, BookMember, Record as BookRecord } from '@/types';
import { getBook, saveBook, verifyPassword, getBookPasswordVerified, setBookPasswordVerified } from '@/utils/github';
import { getMonthKey } from '@/utils/format';
import { getCategoriesByType } from '@/data/categories';

interface BookPageProps {
  config: GitHubConfig;
  deviceName: string;
}

const calculateBalances = (records: BookRecord[], members: BookMember[]) => {
  const balances: Record<string, number> = {};
  members.forEach(m => balances[m.name] = 0);

  records.filter(r => r.type === 'expense' && r.participants && r.participants.length > 0).forEach(record => {
    const perPerson = Math.round(record.amount / record.participants.length * 100) / 100;
    if (balances[record.payer] !== undefined) {
      record.participants.forEach(p => {
        if (p !== record.payer && balances[p] !== undefined) {
          balances[p] -= perPerson;
          balances[record.payer] += perPerson;
        }
      });
    }
  });

  records.filter(r => r.type === 'income' && r.participants && r.participants.length >= 2).forEach(record => {
    const payerIndex = record.participants.indexOf(record.payer || '');
    record.participants.forEach((p, idx) => {
      if (idx !== payerIndex && balances[p] !== undefined) {
        balances[p] -= record.amount;
      }
    });
    if (record.payer && balances[record.payer] !== undefined) {
      balances[record.payer] += record.amount;
    }
  });

  return balances;
};

export const BookPage = ({ config, deviceName }: BookPageProps) => {
  const navigate = useNavigate();
  const { bookId = '' } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<BookRecord | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showIdentitySelect, setShowIdentitySelect] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>(deviceName);

  // 检查并设置当前用户身份
  useEffect(() => {
    if (book && book.members.length > 0) {
      const savedUser = localStorage.getItem(`book_user_${bookId}`);
      if (savedUser && book.members.some(m => m.name === savedUser)) {
        setCurrentUser(savedUser);
      } else {
        setShowIdentitySelect(true);
      }
    }
  }, [book, bookId]);

  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedSettleUsers, setSelectedSettleUsers] = useState<string[]>([]);
  const [settleAmounts, setSettleAmounts] = useState<Record<string, string>>({});
  const [showSyncToast, setShowSyncToast] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitReminder, setShowSubmitReminder] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
        if (!b.members) b.members = [];
        setBook(b);
        localStorage.setItem(`current_book_cache_${bookId}`, JSON.stringify(b));

        if (b.password && !getBookPasswordVerified(bookId)) {
          setShowPasswordModal(true);
        }
      } else {
        const cached = localStorage.getItem(`current_book_cache_${bookId}`);
        if (cached) {
          const cachedBook = JSON.parse(cached);
          setBook(cachedBook);
          setError('网络错误，已显示缓存数据');

          if (cachedBook.password && !getBookPasswordVerified(bookId)) {
            setShowPasswordModal(true);
          }
        } else {
          setError('账本不存在');
        }
      }
    } catch (e: any) {
      const cached = localStorage.getItem(`current_book_cache_${bookId}`);
      if (cached) {
        const cachedBook = JSON.parse(cached);
        setBook(cachedBook);
        setError('网络错误，已显示缓存数据');

        if (cachedBook.password && !getBookPasswordVerified(bookId)) {
          setShowPasswordModal(true);
        }
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

  useEffect(() => {
    if (showSyncToast) {
      const timer = setTimeout(() => {
        setShowSyncToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSyncToast]);

  useEffect(() => {
    if (showSubmitReminder) {
      const timer = setTimeout(() => {
        setShowSubmitReminder(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSubmitReminder]);

  const triggerSubmitReminder = () => {
    setShowSubmitReminder(true);
  };

  const handlePasswordVerify = () => {
    if (!book?.password) return;
    
    if (!passwordInput.trim()) {
      setPasswordError('请输入密码');
      return;
    }

    if (verifyPassword(passwordInput, book.password)) {
      setBookPasswordVerified(bookId, true);
      setShowPasswordModal(false);
      setPasswordError('');
      setPasswordInput('');
    } else {
      setPasswordError('密码不正确');
    }
  };

  const handleRefresh = async () => {
    if (hasLocalChanges && !window.confirm('有未提交的修改，刷新将丢失这些更改，确定要刷新吗？')) {
      return;
    }
    setSyncing(true);
    await loadBook();
    setSyncing(false);
    setHasLocalChanges(false);
  };

  const handleSubmitChanges = async () => {
    if (!book || submitting) return;
    
    setSubmitting(true);
    setError('');
    setShowSyncToast(true);

    try {
      const result = await saveBook(config, book);
      if (result.success) {
        setHasLocalChanges(false);
        setShowSyncToast(false);
      } else {
        setError(result.message || '提交失败');
      }
    } catch (err: any) {
      setError(err.message || '提交失败');
    }
    
    setSubmitting(false);
  };

  const handleAddMember = () => {
    if (!book || !newMemberName.trim()) return;
    const exists = book.members.some(m => m.name === newMemberName.trim());
    if (exists) {
      setError('成员已存在');
      return;
    }

    const newMemberNameTrimmed = newMemberName.trim();
    const updatedBook: Book = {
      ...book,
      members: [...book.members, { name: newMemberNameTrimmed, addedAt: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    };

    setBook(updatedBook);
    setNewMemberName('');
    setShowMembers(false);
    setError('');
    setHasLocalChanges(true);
    triggerSubmitReminder();
  };

  const handleDeleteMember = (name: string) => {
    if (!book) return;
    if (!window.confirm(`确定要删除成员「${name}」吗？`)) return;

    const updatedBook: Book = {
      ...book,
      members: book.members.filter(m => m.name !== name),
      updatedAt: new Date().toISOString(),
    };

    setBook(updatedBook);
    setError('');
    setHasLocalChanges(true);
    triggerSubmitReminder();
  };

  const handleEditRecord = (record: BookRecord) => {
    setEditRecord(record);
    setIsModalOpen(true);
  };

  const handleDeleteRecord = (recordId: string) => {
    if (!book) return;
    if (!window.confirm('确定要删除这条记录吗？')) return;

    const updatedBook: Book = {
      ...book,
      records: book.records.filter(r => r.id !== recordId),
      updatedAt: new Date().toISOString(),
    };

    setBook(updatedBook);
    setError('');
    setHasLocalChanges(true);
    triggerSubmitReminder();
  };

  const handleSelectIdentity = (name: string) => {
    localStorage.setItem(`book_user_${bookId}`, name);
    setCurrentUser(name);
    setShowIdentitySelect(false);
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

  // 身份选择界面
  if (showIdentitySelect && book.members.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">选择你的身份</h2>
            <p className="text-gray-500 mt-2 text-sm">请从账本成员中选择你的身份</p>
          </div>
          <div className="space-y-2 mb-4">
            {book.members.map((member) => (
              <button
                key={member.name}
                onClick={() => handleSelectIdentity(member.name)}
                className="w-full p-4 bg-gray-50 hover:bg-primary-50 border border-gray-200 hover:border-primary-300 rounded-xl text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">{member.name.charAt(0)}</span>
                  </div>
                  <span className="font-medium text-gray-800">{member.name}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center">
            如果你是新成员，请联系管理员添加你的身份
          </p>
        </div>
      </div>
    );
  }

  const filteredRecords = book.records.filter((record) => {
    const matchesMonth = selectedMonth === 'all' || getMonthKey(record.date) === selectedMonth;
    const matchesUser = !record.participants || record.participants.includes(currentUser) || record.payer === currentUser;
    const matchesSearch =
      record.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.createdBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMonth && matchesUser && matchesSearch;
  }).sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // 本月总支出
  const monthlyTotalExpense = book.records
    .filter((r) => r.type === 'expense' && (selectedMonth === 'all' || getMonthKey(r.date) === selectedMonth))
    .reduce((sum, r) => sum + r.amount, 0);

  // 本月个人支出（付款人显示实际付款金额 + 结算时的支出金额）
  const monthlyPersonalExpense = book.records
    .filter((r) => 
      r.payer === currentUser &&
      (selectedMonth === 'all' || getMonthKey(r.date) === selectedMonth) &&
      (r.type === 'expense' || r.category === '结余')
    )
    .reduce((sum, r) => sum + r.amount, 0);

  // 本月收入（收款部分）
  const monthlyIncome = book.records
    .filter((r) => r.type === 'income' && (selectedMonth === 'all' || getMonthKey(r.date) === selectedMonth) && r.participants?.includes(currentUser) && r.payer !== currentUser)
    .reduce((sum, r) => {
      const perPerson = Math.round(r.amount / (r.participants?.length - 1 || 1) * 100) / 100;
      return sum + perPerson;
    }, 0);

  // 计算结余
  const balances = calculateBalances(book.records.filter(r => selectedMonth === 'all' || getMonthKey(r.date) === selectedMonth), book.members);
  const myBalance = balances[currentUser] || 0;

  // 结算算法：贪心算法，每次让负债最多的人给应收最多的人转账
  const settlements: { from: string; to: string; amount: number }[] = [];
  
  // 复制余额数据，保留两位小数精度
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];
  
  Object.entries(balances).forEach(([name, balance]) => {
    if (balance > 0.01) {
      creditors.push({ name, amount: Math.round(balance * 100) / 100 });
    } else if (balance < -0.01) {
      debtors.push({ name, amount: Math.round(-balance * 100) / 100 });
    }
  });
  
  // 按金额从大到小排序
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const payer = debtors[i];
    const receiver = creditors[j];
    const amount = Math.min(payer.amount, receiver.amount);
    
    if (amount > 0.01) {
      settlements.push({
        from: payer.name,
        to: receiver.name,
        amount: Math.round(amount * 100) / 100
      });
    }
    
    payer.amount -= amount;
    receiver.amount -= amount;
    
    if (payer.amount < 0.01) i++;
    if (receiver.amount < 0.01) j++;
  }

  // 按方案分组结算建议（当前用户视角）
  const mySettlementPlans: { title: string; items: { from: string; to: string; amount: number }[] }[] = [];
  const myRelatedSettlements = settlements.filter(s => s.from === currentUser || s.to === currentUser);
  
  if (myRelatedSettlements.length > 0) {
    // 只有一个方案：最小转账次数方案
    // 所有和当前用户相关的结算项都在这个方案里
    mySettlementPlans.push({
      title: '方案1（推荐）',
      items: myRelatedSettlements,
    });
  }

  const months = [
    { key: 'all', label: '全部账单' },
    ...Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return { key: getMonthKey(date.toISOString()), label: `${date.getFullYear()}年${date.getMonth() + 1}月` };
    }),
  ];

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
            <button onClick={() => setShowShare(true)} className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl" title="分享账本">
              <Share2 className="w-5 h-5" />
            </button>
            <button onClick={() => setShowMembers(true)} className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl" title="成员管理">
              <Users className="w-5 h-5" />
            </button>
            <button onClick={() => navigate(`/statistics/${bookId}`)} className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl" title="统计分析">
              <BarChart3 className="w-5 h-5" />
            </button>
            <button onClick={handleRefresh} disabled={syncing || submitting} className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl" title="刷新">
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            {hasLocalChanges && (
              <button onClick={handleSubmitChanges} disabled={submitting} className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                submitting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-primary-500 text-white hover:bg-primary-600'
              }`}>
                {submitting ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {submitting ? '提交中' : '提交'}
              </button>
            )}
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
            <h2 className="text-2xl font-bold text-gray-800">{selectedMonth === 'all' ? '全部概览' : '本月概览'}</h2>
            <p className="text-gray-500 mt-1">{book.description || (selectedMonth === 'all' ? '查看全部收支' : '查看本月收支')}</p>
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
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-600">{sortOrder === 'desc' ? '最新' : '最早'}</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
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
          <StatCard type="income" value={monthlyIncome} label={selectedMonth === 'all' ? '我的总收入' : '我的本月收入'} />
          <StatCard type="expense" value={monthlyTotalExpense} label={selectedMonth === 'all' ? '账本总支出' : '账本本月总支出'} />
          <StatCard type="expense" value={monthlyPersonalExpense} label={selectedMonth === 'all' ? '我的总支出' : '我的支出'} />
        </div>

        {/* 结余显示 */}
        {book.members.length > 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">账单结余</h3>
              {settlements.filter(s => s.from === currentUser).length > 0 && (
                <button onClick={() => {
                  const mySettlements = settlements.filter(s => s.from === currentUser);
                  setSelectedSettleUsers(mySettlements.map(s => s.to));
                  const amounts: Record<string, string> = {};
                  mySettlements.forEach(s => {
                    amounts[s.to] = s.amount.toFixed(2);
                  });
                  setSettleAmounts(amounts);
                  setShowSettleModal(true);
                }} className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors">
                  一键结算
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl ${myBalance > 0 ? 'bg-emerald-50' : myBalance < 0 ? 'bg-rose-50' : 'bg-gray-50'}`}>
                <p className="text-sm text-gray-500">我的结余</p>
                <p className={`text-xl font-bold ${myBalance > 0 ? 'text-emerald-600' : myBalance < 0 ? 'text-rose-600' : 'text-gray-600'}`}>
                  {myBalance > 0 ? `应收 ¥${myBalance.toFixed(2)}` : myBalance < 0 ? `应付 ¥${(-myBalance).toFixed(2)}` : '¥0.00'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {myBalance > 0 ? '其他人应付给你的金额' : myBalance < 0 ? '你应付给付款人的金额' : '已结清'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-2">结算建议</p>
                {mySettlementPlans.length > 0 ? (
                  <div className="space-y-3">
                    {mySettlementPlans.map((plan, i) => (
                      <div key={i} className="border-b border-gray-200 pb-2 last:border-b-0 last:pb-0">
                        <p className="text-xs text-gray-400 mb-1">{plan.title}：</p>
                        {plan.items.map((item, j) => (
                          <p key={j} className="text-sm text-gray-700">
                            {item.from === currentUser 
                              ? `应支付给 ${item.to}：¥${item.amount.toFixed(2)}` 
                              : `${item.from} 应支付给你：¥${item.amount.toFixed(2)}`}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">暂无待结算项</p>
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
                          {record.payer && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{record.payer === currentUser ? '你付' : `${record.payer}付`}</span>}
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
                      {(() => {
                        if (record.category === '结余') {
                          const isPayer = record.payer === currentUser;
                          return (
                            <div className={`text-lg font-bold ${isPayer ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {isPayer ? '-' : '+'}¥{record.amount.toFixed(2)}
                            </div>
                          );
                        }
                        return (
                          <div className={`text-lg font-bold ${record.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {record.type === 'expense' ? '-' : '+'}¥{record.amount.toFixed(2)}
                          </div>
                        );
                      })()}
                      <button onClick={() => handleEditRecord(record)} className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteRecord(record.id)} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
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
        onAdd={(newBook) => {
          setBook(newBook);
          setHasLocalChanges(true);
          setIsModalOpen(false);
          setEditRecord(null);
          triggerSubmitReminder();
        }}
        deviceName={currentUser}
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
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{member.name}</span>
                      {member.name === currentUser && (
                        <span className="text-xs text-primary-500 bg-primary-50 px-2 py-0.5 rounded">当前</span>
                      )}
                    </div>
                    {member.name !== currentUser && (
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

      {/* 结余弹窗 */}
      {showSettleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">一键结算</h2>
              <button onClick={() => setShowSettleModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">选择要结算的对象，输入结算金额（默认为应支付金额）</p>
              
              <div className="space-y-3">
                {book.members.filter(m => m.name !== currentUser).map((member) => (
                  <div key={member.name} className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSettleUsers.includes(member.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSettleUsers([...selectedSettleUsers, member.name]);
                            if (!settleAmounts[member.name]) {
                              const s = settlements.find(st => st.from === currentUser && st.to === member.name);
                              const amounts = { ...settleAmounts };
                              amounts[member.name] = s ? s.amount.toFixed(2) : '0';
                              setSettleAmounts(amounts);
                            }
                          } else {
                            setSelectedSettleUsers(selectedSettleUsers.filter(u => u !== member.name));
                          }
                        }}
                        className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="font-medium text-gray-800">{member.name}</span>
                    </label>
                    {selectedSettleUsers.includes(member.name) && (
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={settleAmounts[member.name] || ''}
                          onChange={(e) => {
                            const amounts = { ...settleAmounts };
                            amounts[member.name] = e.target.value;
                            setSettleAmounts(amounts);
                          }}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">结算总额</span>
                  <span className="text-lg font-bold text-primary-500">¥{selectedSettleUsers.reduce((sum, u) => sum + parseFloat(settleAmounts[u] || '0'), 0).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  const total = selectedSettleUsers.reduce((sum, u) => sum + parseFloat(settleAmounts[u] || '0'), 0);
                  if (total <= 0) {
                    alert('请选择至少一个结算对象并输入金额');
                    return;
                  }

                  if (!book) return;

                  const newRecords: BookRecord[] = [];
                  for (const toUser of selectedSettleUsers) {
                    const amount = parseFloat(settleAmounts[toUser] || '0');
                    if (amount > 0) {
                      newRecords.push({
                        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
                        type: 'income',
                        amount,
                        category: '结余',
                        note: `${currentUser} 结算给 ${toUser}`,
                        date: new Date().toISOString().split('T')[0],
                        createdAt: new Date().toISOString(),
                        createdBy: currentUser,
                        payer: currentUser,
                        participants: [toUser, currentUser],
                      });
                    }
                  }

                  const updatedBook: Book = {
                    ...book,
                    records: [...newRecords, ...book.records],
                    updatedAt: new Date().toISOString(),
                  };

                  setBook(updatedBook);
                  setShowSettleModal(false);
                  setSelectedSettleUsers([]);
                  setSettleAmounts({});
                  setHasLocalChanges(true);
                  triggerSubmitReminder();
                }}
                disabled={selectedSettleUsers.length === 0}
                className="w-full py-3 rounded-xl font-semibold transition-colors bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认结算
              </button>
            </div>
          </div>
        </div>
      )}

      {showSyncToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-full shadow-lg">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium">⏳ 提交中，工作流更新需要等待 1-2 分钟</span>
          </div>
        </div>
      )}

      {showSubmitReminder && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="flex items-center gap-2 px-4 py-3 bg-primary-500 text-white rounded-full shadow-lg">
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">💡 请记得在右上角提交修改</span>
          </div>
        </div>
      )}

      {showShare && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary-500" />
                <h2 className="text-xl font-bold text-gray-800">分享账本</h2>
              </div>
              <button onClick={() => setShowShare(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
                <p className="font-medium mb-2">免登录使用方法</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>复制下方链接，发送给家人或队友</li>
                  <li>对方在浏览器打开链接即可直接使用</li>
                  <li>无需注册账号，无需登录 GitHub</li>
                  <li>支持电脑、手机、平板多设备访问</li>
                </ol>
              </div>

              {config.token && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="includeToken"
                      checked={true}
                      readOnly
                      className="mt-1"
                    />
                    <label htmlFor="includeToken" className="flex-1">
                      <p className="font-medium">附带 Token（可写入）</p>
                      <p className="text-xs mt-1 text-amber-600">
                        对方打开链接也能添加/删除记录。
                        <br />
                        链接中会包含 Token，请只发给信任的人。
                      </p>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分享链接</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={(() => {
                      const base = window.location.origin + '/tt/';
                      const params = new URLSearchParams();
                      params.set('owner', config.owner);
                      params.set('repo', config.repo);
                      if (config.branch && config.branch !== 'main') {
                        params.set('branch', config.branch);
                      }
                      if (config.token) {
                        params.set('token', config.token);
                      }
                      return `${base}#/?${params.toString()}`;
                    })()}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-600 focus:outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      const base = window.location.origin + '/tt/';
                      const params = new URLSearchParams();
                      params.set('owner', config.owner);
                      params.set('repo', config.repo);
                      if (config.branch && config.branch !== 'main') {
                        params.set('branch', config.branch);
                      }
                      if (config.token) {
                        params.set('token', config.token);
                      }
                      const url = `${base}#/?${params.toString()}`;
                      navigator.clipboard.writeText(url);
                    }}
                    className="px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 flex items-center gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    复制
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 text-center">账本已加密</h2>
              <p className="text-sm text-gray-500 text-center mt-2">
                请输入密码以访问账本「{book?.name}」
              </p>
            </div>
            <div className="p-6 space-y-4">
              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm text-center">
                  {passwordError}
                </div>
              )}
              <div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordVerify()}
                  placeholder="请输入密码"
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-center text-lg"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                >
                  返回
                </button>
                <button
                  onClick={handlePasswordVerify}
                  className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold hover:shadow-lg"
                >
                  验证
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};