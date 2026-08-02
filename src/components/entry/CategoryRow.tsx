import { useState } from 'react';
import type { CategoryDef } from '../../types';
import { useBudgetStore } from '../../store/useBudgetStore';
import { categoryDayTotal } from '../../lib/calculations';
import Money from '../common/Money';
import EntryLine from './EntryLine';

export default function CategoryRow({
  category,
  year,
  month,
  day,
}: {
  category: CategoryDef;
  year: number;
  month: number;
  day: number;
}) {
  const entries = useBudgetStore((s) => s.entries);
  const addEntry = useBudgetStore((s) => s.addEntry);
  const addFixedSeriesEntry = useBudgetStore((s) => s.addFixedSeriesEntry);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const isFixed = category.section === 'fixed';

  const categoryEntries = entries
    .filter(
      (e) => e.categoryId === category.id && e.year === year && e.month === month && e.day === day,
    )
    .sort((a, b) => a.label.localeCompare(b.label));
  const total = categoryDayTotal(entries, category.id, year, month, day);

  function handleAdd() {
    const parsed = Number(newAmount.replace(/,/g, ''));
    if (!newAmount || !Number.isFinite(parsed) || parsed === 0) return;
    const payload = {
      categoryId: category.id,
      year,
      month,
      day,
      label: newLabel.trim() || category.name,
      amount: parsed,
    };
    if (isFixed) {
      addFixedSeriesEntry(payload);
    } else {
      addEntry(payload);
    }
    setNewLabel('');
    setNewAmount('');
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 py-2 last:border-b-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {category.emoji} {category.name}
        </span>
        <span className="text-sm font-semibold">
          <Money amount={total} />
        </span>
      </div>
      {categoryEntries.length > 0 && (
        <div className="mt-1 pl-2">
          {categoryEntries.map((entry) => (
            <EntryLine key={entry.id} entry={entry} />
          ))}
        </div>
      )}
      <div className="mt-1 flex items-center gap-2 pl-2">
        <input
          className="min-w-0 flex-1 rounded border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
          placeholder="항목명 (선택)"
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
      {isFixed && (
        <p className="mt-1 pl-2 text-xs text-gray-400 dark:text-gray-500">
          이 달부터 12월까지 자동으로 반영됩니다. 이후 항목별로 이번 달만 수정하거나 다음 달부터 쭉 이어서 수정할 수 있어요.
        </p>
      )}
    </div>
  );
}
