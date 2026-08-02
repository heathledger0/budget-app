import { useState } from 'react';
import type { Entry } from '../../types';
import { useBudgetStore } from '../../store/useBudgetStore';
import { categoryById } from '../../constants/categories';
import Money from '../common/Money';

export default function EntryLine({ entry }: { entry: Entry }) {
  const updateEntry = useBudgetStore((s) => s.updateEntry);
  const updateEntrySeriesForward = useBudgetStore((s) => s.updateEntrySeriesForward);
  const removeEntry = useBudgetStore((s) => s.removeEntry);
  const [label, setLabel] = useState(entry.label);
  const [amount, setAmount] = useState(String(entry.amount));
  const [memo, setMemo] = useState(entry.memo ?? '');

  const isFixed = categoryById(entry.categoryId)?.section === 'fixed';

  function currentPatch() {
    const parsed = Number(amount.replace(/,/g, ''));
    return {
      label: label.trim() || '항목',
      amount: Number.isFinite(parsed) ? parsed : 0,
      memo: memo.trim() || undefined,
    };
  }

  function commit() {
    const patch = currentPatch();
    updateEntry(entry.id, {
      categoryId: entry.categoryId,
      year: entry.year,
      month: entry.month,
      day: entry.day,
      ...patch,
    });
  }

  function commitThisMonthOnly() {
    commit();
  }

  function commitAndContinue() {
    updateEntrySeriesForward(entry, currentPatch());
  }

  return (
    <div className="py-1 text-sm">
      <div className="flex items-center gap-2">
        <input
          className="min-w-0 flex-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={isFixed ? undefined : commit}
          placeholder="항목명"
        />
        <input
          className="w-28 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-right"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={isFixed ? undefined : commit}
          inputMode="numeric"
          placeholder="금액"
        />
        <input
          className="w-32 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hidden sm:block px-2 py-1"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onBlur={isFixed ? undefined : commit}
          placeholder="메모"
        />
        <span className="w-24 shrink-0 text-right hidden md:inline">
          <Money amount={entry.amount} />
        </span>
        <button
          type="button"
          onClick={() => removeEntry(entry.id)}
          className="shrink-0 rounded px-2 py-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950 dark:hover:text-red-400"
          aria-label="삭제"
        >
          ×
        </button>
      </div>
      {isFixed && (
        <div className="mt-1 flex justify-end gap-2 pr-8">
          <button
            type="button"
            onClick={commitThisMonthOnly}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            이번 달 수정
          </button>
          <button
            type="button"
            onClick={commitAndContinue}
            className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
          >
            수정 및 유지
          </button>
        </div>
      )}
    </div>
  );
}
