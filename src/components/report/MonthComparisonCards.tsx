import type { MonthlySummary } from '../../lib/calculations';
import { formatChange } from '../../lib/format';
import Money from '../common/Money';

interface CardDef {
  label: string;
  current: number;
  previous: number;
  accent: string;
  goodDirection: 'up' | 'down';
}

function changeColor(current: number, previous: number, goodDirection: 'up' | 'down'): string {
  if (previous === 0 && current === 0) return 'text-gray-400 dark:text-gray-500';
  const increased = current > previous;
  const good = goodDirection === 'up' ? increased : !increased;
  if (current === previous) return 'text-gray-400 dark:text-gray-500';
  return good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}

export default function MonthComparisonCards({
  summary,
  prevSummary,
  prevLabel,
}: {
  summary: MonthlySummary;
  prevSummary: MonthlySummary;
  prevLabel: string;
}) {
  const cards: CardDef[] = [
    { label: '수입', current: summary.income, previous: prevSummary.income, accent: 'text-blue-600 dark:text-blue-400', goodDirection: 'up' },
    { label: '총지출', current: summary.totalExpense, previous: prevSummary.totalExpense, accent: 'text-orange-600 dark:text-orange-400', goodDirection: 'down' },
    { label: '저축/투자', current: summary.saving, previous: prevSummary.saving, accent: 'text-emerald-600 dark:text-emerald-400', goodDirection: 'up' },
    { label: '순잔액', current: summary.netBalance, previous: prevSummary.netBalance, accent: 'text-gray-900 dark:text-gray-100', goodDirection: 'up' },
  ];

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <h2 className="mb-3 text-base font-bold text-gray-900 dark:text-gray-100">
        {prevLabel} 대비
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label}>
            <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
            <div className={`mt-1 text-lg font-bold ${card.accent}`}>
              <Money amount={card.current} />
            </div>
            <div className={`text-xs font-medium ${changeColor(card.current, card.previous, card.goodDirection)}`}>
              {formatChange(card.current, card.previous)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
