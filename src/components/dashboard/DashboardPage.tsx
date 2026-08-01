import { useSelectionStore } from '../../store/useSelectionStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import { monthlySummary, yearSummaries } from '../../lib/calculations';
import SummaryCards from './SummaryCards';
import YearTrendChart from './YearTrendChart';

export default function DashboardPage() {
  const { year, month } = useSelectionStore();
  const entries = useBudgetStore((s) => s.entries);
  const summary = monthlySummary(entries, year, month);
  const yearData = yearSummaries(entries, year);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-1 text-sm text-gray-500">
          {year}년 {month}월 기준 요약과 {year}년 전체 추이입니다.
        </p>
      </div>

      <SummaryCards summary={summary} />
      <YearTrendChart data={yearData} />
    </div>
  );
}
