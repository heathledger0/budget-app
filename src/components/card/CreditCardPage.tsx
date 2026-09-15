import { useRef, useState } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import Money from '../common/Money';
import CardEntryLine from './CardEntryLine';
import CategorySelect from './CategorySelect';

export default function CreditCardPage() {
  const { year, month } = useSelectionStore();
  const cardEntries = useBudgetStore((s) => s.cardEntries);
  const addCardEntry = useBudgetStore((s) => s.addCardEntry);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newDay, setNewDay] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const monthEntries = cardEntries
    .filter((e) => e.year === year && e.month === month)
    .sort((a, b) => (a.day ?? 99) - (b.day ?? 99) || a.label.localeCompare(b.label));
  const monthTotal = monthEntries.reduce((sum, e) => sum + e.amount, 0);
  const yearTotal = cardEntries
    .filter((e) => e.year === year)
    .reduce((sum, e) => sum + e.amount, 0);
  const allTimeTotal = cardEntries.reduce((sum, e) => sum + e.amount, 0);

  async function handleAdd() {
    if (submittingRef.current) return;
    const parsed = Number(newAmount.replace(/,/g, ''));
    if (!newAmount || !Number.isFinite(parsed) || parsed === 0) return;
    const parsedDay = newDay ? Math.min(31, Math.max(1, Math.round(Number(newDay)))) : undefined;
    submittingRef.current = true;
    setError(null);
    try {
      await addCardEntry({
        year,
        month,
        label: newLabel.trim() || '카드 사용',
        amount: parsed,
        categoryId: newCategoryId || undefined,
        day: Number.isFinite(parsedDay) ? parsedDay : undefined,
      });
      setNewLabel('');
      setNewAmount('');
      setNewCategoryId('');
      setNewDay('');
    } catch {
      setError(
        '저장에 실패했어요. Supabase에서 card_entries 테이블 마이그레이션(schema.sql)을 실행했는지 확인해주세요.',
      );
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">신용카드 트래커</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          카드를 쓸 때마다 누적 기록하는 별도 트래커입니다. 항목마다 카테고리를 고르면 그 지출이
          해당 카테고리 합계·예산 비교에도 자동으로 반영되어, 월별 입력에 따로 적지 않아도 됩니다.
          카테고리를 고르지 않으면 예전처럼 이 트래커에서만 누적됩니다. 일(날짜)은 선택 사항으로,
          비워두면 월 단위로만 집계됩니다.
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
        {error && (
          <p className="mt-2 rounded bg-red-50 px-2 py-1.5 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            className="min-w-0 flex-1 rounded border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
            placeholder="사용처 (선택)"
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
          <input
            className="w-20 rounded border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-right text-sm"
            placeholder="일(선택)"
            inputMode="numeric"
            type="number"
            min={1}
            max={31}
            value={newDay}
            onChange={(e) => setNewDay(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <CategorySelect
            value={newCategoryId}
            onChange={setNewCategoryId}
            className="rounded border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
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
