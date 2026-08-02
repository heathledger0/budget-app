import { useState } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import Money from '../common/Money';
import CardEntryLine from './CardEntryLine';

export default function CreditCardPage() {
  const { year, month } = useSelectionStore();
  const cardEntries = useBudgetStore((s) => s.cardEntries);
  const addCardEntry = useBudgetStore((s) => s.addCardEntry);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const monthEntries = cardEntries
    .filter((e) => e.year === year && e.month === month)
    .sort((a, b) => a.label.localeCompare(b.label));
  const monthTotal = monthEntries.reduce((sum, e) => sum + e.amount, 0);
  const yearTotal = cardEntries
    .filter((e) => e.year === year)
    .reduce((sum, e) => sum + e.amount, 0);
  const allTimeTotal = cardEntries.reduce((sum, e) => sum + e.amount, 0);

  function handleAdd() {
    const parsed = Number(newAmount.replace(/,/g, ''));
    if (!newAmount || !Number.isFinite(parsed) || parsed === 0) return;
    addCardEntry({ year, month, label: newLabel.trim() || '카드 사용', amount: parsed });
    setNewLabel('');
    setNewAmount('');
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">신용카드 트래커</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          카드를 쓸 때마다 누적 기록하는 별도 트래커입니다. 카테고리별 지출 합계에는 반영되지 않습니다.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">{month}월 사용액</div>
          <div className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
            <Money amount={monthTotal} />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">{year}년 누적</div>
          <div className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
            <Money amount={yearTotal} />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">전체 누적</div>
          <div className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
            <Money amount={allTimeTotal} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h2 className="mb-2 text-base font-bold text-gray-900 dark:text-gray-100">
          {year}년 {month}월 사용 내역
        </h2>
        {monthEntries.map((entry) => (
          <CardEntryLine key={entry.id} entry={entry} />
        ))}
        <div className="mt-2 flex items-center gap-2">
          <input
            className="min-w-0 flex-1 rounded border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
            placeholder="사용처 (선택)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <input
            className="w-28 rounded border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-right text-sm"
            placeholder="금액 입력"
            inputMode="numeric"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            type="button"
            onClick={handleAdd}
            className="shrink-0 rounded bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
