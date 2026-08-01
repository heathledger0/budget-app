import { useEffect } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import { daysInMonth, monthlySummary } from '../../lib/calculations';
import Money from '../common/Money';
import Calendar from './Calendar';
import SectionCard from './SectionCard';

export default function MonthlyEntryPage() {
  const { year, month, day, setDay } = useSelectionStore();
  const entries = useBudgetStore((s) => s.entries);
  const summary = monthlySummary(entries, year, month);

  useEffect(() => {
    const max = daysInMonth(year, month);
    if (day > max) setDay(max);
  }, [year, month, day, setDay]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {year}년 {month}월 가계부 입력
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          달력에서 날짜를 선택하고, 카테고리별로 항목명과 금액을 입력해 추가하세요.
        </p>
      </div>

      <Calendar year={year} month={month} selectedDay={day} onSelectDay={setDay} entries={entries} />

      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {year}년 {month}월 {day}일 입력
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard section="income" year={year} month={month} day={day} />
        <SectionCard section="fixed" year={year} month={month} day={day} />
        <SectionCard section="saving" year={year} month={month} day={day} />
        <SectionCard section="variable" year={year} month={month} day={day} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-base font-bold text-gray-900">이번 달 요약</h2>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 md:grid-cols-6">
          <SummaryItem label="수입 합계" amount={summary.income} />
          <SummaryItem label="고정지출 합계" amount={summary.fixed} />
          <SummaryItem label="저축/투자 합계" amount={summary.saving} />
          <SummaryItem label="변동지출 합계" amount={summary.variable} />
          <SummaryItem label="총지출" amount={summary.totalExpense} />
          <SummaryItem label="순잔액" amount={summary.netBalance} emphasize />
        </div>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  amount,
  emphasize,
}: {
  label: string;
  amount: number;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-md bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 font-semibold ${emphasize ? 'text-lg' : ''}`}>
        <Money amount={amount} />
      </div>
    </div>
  );
}
