import { useState } from 'react';
import type { CategoryDef } from '../../types';
import { useBudgetStore } from '../../store/useBudgetStore';
import { categoryTotal } from '../../lib/calculations';
import Money from '../common/Money';
import EntryLine from './EntryLine';

export default function CategoryRow({
  category,
  year,
  month,
}: {
  category: CategoryDef;
  year: number;
  month: number;
}) {
  const entries = useBudgetStore((s) => s.entries);
  const addEntry = useBudgetStore((s) => s.addEntry);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const categoryEntries = entries
    .filter((e) => e.categoryId === category.id && e.year === year && e.month === month)
    .sort((a, b) => a.label.localeCompare(b.label));
  const total = categoryTotal(entries, category.id, year, month);

  function handleAdd() {
    const parsed = Number(newAmount.replace(/,/g, ''));
    if (!newAmount || !Number.isFinite(parsed) || parsed === 0) return;
    addEntry({
      categoryId: category.id,
      year,
      month,
      label: newLabel.trim() || category.name,
      amount: parsed,
    });
    setNewLabel('');
    setNewAmount('');
  }

  return (
    <div className="border-b border-gray-100 py-2 last:border-b-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">{category.name}</span>
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
          className="min-w-0 flex-1 rounded border border-dashed border-gray-300 px-2 py-1 text-sm"
          placeholder="항목명 (선택)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <input
          className="w-28 rounded border border-dashed border-gray-300 px-2 py-1 text-right text-sm"
          placeholder="금액 입력"
          inputMode="numeric"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="shrink-0 rounded bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-100"
        >
          추가
        </button>
      </div>
    </div>
  );
}
