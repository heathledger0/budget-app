import { useState } from 'react';
import type { CardEntry } from '../../types';
import { useBudgetStore } from '../../store/useBudgetStore';
import { describeError } from '../../lib/format';
import Money from '../common/Money';
import CategorySelect from './CategorySelect';

export default function CardEntryLine({ entry }: { entry: CardEntry }) {
  const updateCardEntry = useBudgetStore((s) => s.updateCardEntry);
  const removeCardEntry = useBudgetStore((s) => s.removeCardEntry);
  const [label, setLabel] = useState(entry.label);
  const [amount, setAmount] = useState(String(entry.amount));
  const [memo, setMemo] = useState(entry.memo ?? '');
  const [day, setDay] = useState(entry.day ? String(entry.day) : '');
  const [error, setError] = useState<string | null>(null);

  function commit(patch: { categoryId?: string; day?: number } = {}) {
    const parsed = Number(amount.replace(/,/g, ''));
    setError(null);
    updateCardEntry(entry.id, {
      year: entry.year,
      month: entry.month,
      label: label.trim() || '카드 사용',
      amount: Number.isFinite(parsed) ? parsed : 0,
      memo: memo.trim() || undefined,
      categoryId: 'categoryId' in patch ? patch.categoryId : entry.categoryId,
      day: 'day' in patch ? patch.day : entry.day,
    }).catch((err: unknown) => {
      setError(`저장 실패: ${describeError(err)}`);
    });
  }

  function commitDay() {
    const parsed = day ? Math.min(31, Math.max(1, Math.round(Number(day)))) : undefined;
    commit({ day: Number.isFinite(parsed) ? parsed : undefined });
  }

  return (
    <div className="border-b border-gray-50 dark:border-gray-700 py-1.5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input
          className="min-w-0 flex-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => commit()}
          placeholder="사용처"
        />
        <input
          className="w-28 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-right"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => commit()}
          inputMode="numeric"
          placeholder="금액"
        />
        <input
          className="w-16 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-right"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          onBlur={commitDay}
          inputMode="numeric"
          type="number"
          min={1}
          max={31}
          placeholder="일"
        />
        <CategorySelect
          value={entry.categoryId ?? ''}
          onChange={(categoryId) => commit({ categoryId: categoryId || undefined })}
          className="rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
        />
        <input
          className="hidden w-32 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-gray-500 dark:text-gray-400 sm:block"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onBlur={() => commit()}
          placeholder="메모"
        />
        <span className="hidden w-24 shrink-0 text-right md:inline">
          <Money amount={entry.amount} />
        </span>
        <button
          type="button"
          onClick={() => removeCardEntry(entry.id)}
          className="shrink-0 rounded px-2 py-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950 dark:hover:text-red-400"
          aria-label="삭제"
        >
          ×
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
