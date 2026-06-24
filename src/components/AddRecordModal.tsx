﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useEffect } from 'react';
import { X, Users, User } from 'lucide-react';
import { getCategoriesByType } from '@/data/categories';
import { Book, Record as BookRecord, GitHubConfig } from '@/types';
import { addRecordToBook, saveBook, getBook } from '@/utils/github';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  onSyncStart?: () => void;
  onSyncComplete?: () => void;
  bookId: string;
  deviceName: string;
  book: Book | null;
  editRecord?: BookRecord | null;
  config: GitHubConfig;
}

export const AddRecordModal = ({ isOpen, onClose, onAdd, onSyncStart, onSyncComplete, bookId, deviceName, book, editRecord, config }: AddRecordModalProps) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payer, setPayer] = useState(deviceName);
  const [participants, setParticipants] = useState<string[]>([deviceName]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const categories = getCategoriesByType(type);
  const members = book?.members || [];

  // 初始化编辑模式
  useEffect(() => {
    if (editRecord) {
      setType(editRecord.type);
      setAmount(editRecord.amount.toString());
      setCategory(editRecord.category);
      setNote(editRecord.note);
      setDate(editRecord.date);
      setPayer(editRecord.payer || deviceName);
      setParticipants(editRecord.participants || [deviceName]);
    } else {
      setType('expense');
      setAmount('');
      setCategory('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      setPayer(deviceName);
      setParticipants([deviceName]);
    }
  }, [editRecord, deviceName]);

  // 计算每人应付金额（四舍五入）
  const perPersonAmount = participants.length > 0 && amount
    ? Math.round(parseFloat(amount) / participants.length * 100) / 100
    : 0;

  const handleParticipantToggle = (name: string) => {
    if (participants.includes(name)) {
      setParticipants(participants.filter(p => p !== name));
    } else {
      setParticipants([...participants, name]);
    }
  };

  const handlePayerChange = (name: string) => {
    setPayer(name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    setSubmitting(true);
    setError('');
    onSyncStart?.();

    try {
      if (editRecord && book) {
        const updatedRecord: BookRecord = {
          ...editRecord,
          type,
          amount: parseFloat(amount),
          category,
          note,
          date,
          payer,
          participants,
        };

        onClose();
        onAdd();

        const bookData = await getBook(config, bookId);
        if (!bookData) {
          setError('账本不存在');
          setSubmitting(false);
          onSyncComplete?.();
          return;
        }
        const idx = bookData.records.findIndex(r => r.id === editRecord.id);
        if (idx !== -1) {
          bookData.records[idx] = updatedRecord;
          bookData.updatedAt = new Date().toISOString();
          const result = await saveBook(config, bookData);
          if (!result.success) {
            setError(result.message || '保存失败');
          }
        }
        setSubmitting(false);
        onSyncComplete?.();
      } else {
        onClose();
        onAdd();

        const result = await addRecordToBook(config, bookId, {
          type,
          amount: parseFloat(amount),
          category,
          note,
          date,
          createdBy: deviceName,
          payer,
          participants,
        });
        if (!result.success) {
          setError(result.message || '保存失败');
        }
        setSubmitting(false);
        setType('expense');
        setAmount('');
        setCategory('');
        setNote('');
        setDate(new Date().toISOString().split('T')[0]);
        setPayer(deviceName);
        setParticipants([deviceName]);
        onSyncComplete?.();
      }
    } catch (err: any) {
      setError(err.message || '保存失败');
      setSubmitting(false);
      onSyncComplete?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">{editRecord ? '编辑记录' : '添加记录'}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategory(''); }}
              className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                type === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-500'
              }`}
            >
              支出
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategory(''); }}
              className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                type === 'income' ? 'bg-white text-emerald-500 shadow-sm' : 'text-gray-500'
              }`}
            >
              收入
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">金额</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.name)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                    category === cat.name
                      ? 'border-primary-500 bg-primary-50 text-primary-600'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-xs">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {type === 'expense' && members.length > 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  付款人
                </label>
                <select
                  value={payer}
                  onChange={(e) => handlePayerChange(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {members.map((m) => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  参与成员（平分金额）
                </label>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => handleParticipantToggle(m.name)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        participants.includes(m.name)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } ${m.name === payer ? 'ring-2 ring-primary-300' : ''}`}
                    >
                      {m.name}
                      {m.name === payer && participants.includes(m.name) && ' (付款)'}
                      {m.name === payer && !participants.includes(m.name) && ' (代付)'}
                    </button>
                  ))}
                </div>
                {amount && participants.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    每人应付：¥{perPersonAmount.toFixed(2)}
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="添加备注..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={!amount || !category || submitting}
            className={`w-full py-3.5 rounded-xl font-semibold transition-all ${
              amount && category && !submitting
                ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/30'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                同步中...
              </span>
            ) : editRecord ? '保存修改' : '保存'}
          </button>
          {submitting && (
            <p className="text-center text-xs text-amber-500 mt-3">
              ⏳ 正在同步到 GitHub，工作流更新需要等待 1-2 分钟
            </p>
          )}
        </form>
      </div>
    </div>
  );
};