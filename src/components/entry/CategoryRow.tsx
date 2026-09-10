import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CategoryDef, Entry } from '../../types';
import { useBudgetStore } from '../../store/useBudgetStore';
import { categoryDayTotal } from '../../lib/calculations';
import Money from '../common/Money';
import EntryLine from './EntryLine';

export default function CategoryRow({
  category,
  year,
  month,
  day,
  entries,
}: {
  category: CategoryDef;
  year: number;
  month: number;
  day: number;
  /** Cash entries plus categorized card entries (see withCardEntries), merged by the caller. */
  entries: Entry[];
}) {
  const addEntry = useBudgetStore((s) => s.addEntry);
  const addFixedSeriesEntry = useBudgetStore((s) => s.addFixedSeriesEntry);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const isFixed = category.section === 'fixed';
  const submittingRef = useRef(false);

  const dayEntries = entries.filter(
    (e) => e.categoryId === category.id && e.year === year && e.month === month && e.day === day,
  );
  // Card-sourced rows (see calculations.categorizedCardEntries) are synthetic and read-only here —
  // they're edited on the 신용카드 트래커 page, identified by their "card-" id prefix.
  const cashEntries = dayEntries
    .filter((e) => !e.id.startsWith('card-'))
    .sort((a, b) => a.label.localeCompare(b.label));
  const cardSourcedEntries = dayEntries.filter((e) => e.id.startsWith('card-'));
  const total = categoryDayTotal(entries, category.id, year, month, day);

  async function handleAdd() {
    if (submittingRef.current) return;
    const parsed = Number(newAmount.replace(/,/g, ''));
    if (!newAmount || !Number.isFinite(parsed) || parsed === 0) return;
    submittingRef.current = true;
    try {
      const payload = {
        categoryId: category.id,
        year,
        month,
        day,
        label: newLabel.trim() || category.name,
        amount: parsed,
      };
      if (isFixed) {
        await addFixedSeriesEntry(payload);
      } else {
        await addEntry(payload);
      }
      setNewLabel('');
      setNewAmount('');
    } finally {
      submittingRef.current = false;
    }
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
      {cashEntries.length > 0 && (
        <div className="mt-1 pl-2">
          {cashEntries.map((entry) => (
            <EntryLine key={entry.id} entry={entry} />
          ))}
        </div>
      )}
      {cardSourcedEntries.length > 0 && (
        <div className="mt-1 flex flex-col gap-1 pl-2">
          {cardSourcedEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded bg-gray-50 dark:bg-gray-900/40 px-2 py-1 text-sm text-gray-500 dark:text-gray-400"
            >
              <span>{entry.label}</span>
              <span className="flex items-center gap-2">
                <Money amount={entry.amount} />
                <Link
                  to="/card"
                  className="text-xs text-blue-500 hover:underline dark:text-blue-400"
                >
                  수정
                </Link>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-1 flex items-center gap-2 pl-2">
        <input
          className="min-w-0 flex-1 rounded border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
          placeholder="항목명 (선택)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleAdd()}
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
