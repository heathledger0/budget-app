import { useState } from 'react';
import type { Entry } from '../../types';
import { useBudgetStore } from '../../store/useBudgetStore';
import Money from '../common/Money';

export default function EntryLine({ entry }: { entry: Entry }) {
  const updateEntry = useBudgetStore((s) => s.updateEntry);
  const removeEntry = useBudgetStore((s) => s.removeEntry);
  const [label, setLabel] = useState(entry.label);
  const [amount, setAmount] = useState(String(entry.amount));
  const [memo, setMemo] = useState(entry.memo ?? '');

  function commit() {
    const parsed = Number(amount.replace(/,/g, ''));
    updateEntry(entry.id, {
      categoryId: entry.categoryId,
      year: entry.year,
      month: entry.month,
      label: label.trim() || '항목',
      amount: Number.isFinite(parsed) ? parsed : 0,
      memo: memo.trim() || undefined,
    });
  }

  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <input
        className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commit}
        placeholder="항목명"
      />
      <input
        className="w-28 rounded border border-gray-200 px-2 py-1 text-right"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onBlur={commit}
        inputMode="numeric"
        placeholder="금액"
      />
      <input
        className="w-32 rounded border border-gray-200 px-2 py-1 text-gray-500 hidden sm:block"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        onBlur={commit}
        placeholder="메모"
      />
      <span className="w-24 shrink-0 text-right hidden md:inline">
        <Money amount={entry.amount} />
      </span>
      <button
        type="button"
        onClick={() => removeEntry(entry.id)}
        className="shrink-0 rounded px-2 py-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
        aria-label="삭제"
      >
        ×
      </button>
    </div>
  );
}
