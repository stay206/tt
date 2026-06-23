import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface StatCardProps {
  type: 'income' | 'expense' | 'balance';
  value: number;
  label: string;
}

export const StatCard = ({ type, value, label }: StatCardProps) => {
  const styles = {
    income: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'text-emerald-500',
      amount: 'text-emerald-600',
    },
    expense: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      icon: 'text-rose-500',
      amount: 'text-rose-600',
    },
    balance: {
      bg: 'bg-primary-50',
      border: 'border-primary-200',
      icon: 'text-primary-500',
      amount: value >= 0 ? 'text-primary-600' : 'text-rose-600',
    },
  };

  const icons = {
    income: <TrendingUp className="w-6 h-6" />,
    expense: <TrendingDown className="w-6 h-6" />,
    balance: <Wallet className="w-6 h-6" />,
  };

  const style = styles[type];

  return (
    <div
      className={`${style.bg} ${style.border} rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow duration-300`}
    >
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-sm font-medium">{label}</span>
        <div className={`${style.icon} p-2 bg-white rounded-xl`}>
          {icons[type]}
        </div>
      </div>
      <div className={`mt-3 text-2xl font-bold ${style.amount}`}>
        {formatCurrency(value)}
      </div>
    </div>
  );
};