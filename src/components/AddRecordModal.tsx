﻿﻿﻿﻿﻿import { useState, useEffect } from 'react';
import { X, Users, User } from 'lucide-react';
import { getCategoriesByType } from '@/data/categories';
import { Book, Record as BookRecord } from '@/types';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (book: Book) => void;
  deviceName: string;
  book: Book | null;
  editRecord?: BookRecord | null;
}

export const AddRecordModal = ({ isOpen, onClose, onAdd, deviceName, book, editRecord }: AddRecordModalProps) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payer, setPayer] = useState(deviceName);
  const [participants, setParticipants] = useState<string[]>([deviceName]);
  const [error, setError] = useState('');

  const categories = getCategoriesByType(type);
  const members = book?.members || [];

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !book) return;

    setError('');

    if (editRecord) {
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

      const updatedBook: Book = {
        ...book,
        records: book.records.map(r => r.id === editRecord.id ? updatedRecord : r),
        updatedAt: new Date().toISOString(),
      };

      onAdd(updatedBook);
      setType('expense');
      setAmount('');
      setCategory('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      setPayer(deviceName);
      setParticipants([deviceName]);
    } else {
      const newRecord: BookRecord = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
        type,
        amount: parseFloat(amount),
        category,
        note,
        date,
        createdAt: new Date().toISOString(),
        createdBy: deviceName,
        payer,
        participants,
      };

      const updatedBook: Book = {
        ...book,
        records: [newRecord, ...book.records],
        updatedAt: new Date().toISOString(),
      };

      onAdd(updatedBook);
      setType('expense');
      setAmount('');
      setCategory('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      setPayer(deviceName);
      setParticipants([deviceName]);
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
                type === 'expense'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              支出
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategory(''); }}
              className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                type === 'income'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              收入
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">金额</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">¥</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xl font-semibold"
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
                  className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                    category === cat.name
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="text-xl mb-1">{cat.icon}</span>
                  <span className="text-xs font-medium">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">付款人</label>
            <div className="flex gap-2">
              {members.map((member) => (
                <button
                  key={member.name}
                  type="button"
                  onClick={() => handlePayerChange(member.name)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                    payer === member.name
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="font-medium">{member.name}</span>
                  {member.name === payer && <span className="text-xs">付款</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              参与成员
              <span className="text-gray-400 font-normal ml-2">({participants.length}人)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <button
                  key={member.name}
                  type="button"
                  onClick={() => handleParticipantToggle(member.name)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                    participants.includes(member.name)
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{member.name}</span>
                  {member.name === payer && participants.includes(member.name) && <span className="text-xs">(付款)</span>}
                  {member.name !== payer && participants.includes(member.name) && <span className="text-xs">(分摊)</span>}
                </button>
              ))}
            </div>
            {participants.length > 1 && (
              <div className="mt-2 text-sm text-gray-500">
                每人分摊：¥{perPersonAmount.toFixed(2)}
              </div>
            )}
          </div>

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
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="添加备注..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={!amount || !category}
            className="w-full py-4 bg-primary-500 text-white rounded-xl font-semibold text-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editRecord ? '保存修改' : '添加记录'}
          </button>
        </form>
      </div>
    </div>
  );
};