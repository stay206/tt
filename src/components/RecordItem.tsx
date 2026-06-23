import { Trash2 } from 'lucide-react';
import { Record } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import { getCategoryByName } from '@/data/categories';

interface RecordItemProps {
  record: Record;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

export const RecordItem = ({ record, onDelete, canDelete }: RecordItemProps) => {
  const category = getCategoryByName(record.category);
  const isIncome = record.type === 'income';

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: (category?.color || '#0ea5e9') + '20' }}
          >
            {category?.icon || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-800">{record.category}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {record.createdBy}
              </span>
            </div>
            {record.note && (
              <div className="text-sm text-gray-400 mt-0.5 truncate">{record.note}</div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              {formatDate(record.date)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className={`text-lg font-bold ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isIncome ? '+' : '-'}{formatCurrency(record.amount)}
          </div>
          {canDelete && (
            <button
              onClick={() => onDelete(record.id)}
              className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};