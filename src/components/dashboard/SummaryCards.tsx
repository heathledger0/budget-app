import type { MonthlySummary } from '../../lib/calculations';
import Money from '../common/Money';

export default function SummaryCards({ summary }: { summary: MonthlySummary }) {
  const cards = [
    { label: '이번 달 수입', amount: summary.income, accent: 'text-blue-600' },
    { label: '이번 달 총지출', amount: summary.totalExpense, accent: 'text-orange-600' },
    { label: '이번 달 저축/투자', amount: summary.saving, accent: 'text-emerald-600' },
    { label: '이번 달 순잔액', amount: summary.netBalance, accent: 'text-gray-900' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500">{card.label}</div>
          <div className={`mt-1 text-xl font-bold ${card.accent}`}>
            <Money amount={card.amount} />
          </div>
        </div>
      ))}
    </div>
  );
}
