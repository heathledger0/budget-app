import { useSelectionStore } from '../../store/useSelectionStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import {
  monthDailySummaries,
  monthExpenseByCategory,
  monthlySummary,
  previousMonth,
} from '../../lib/calculations';
import SummaryCards from '../dashboard/SummaryCards';
import MonthComparisonCards from './MonthComparisonCards';
import MonthDailyTrendChart from './MonthDailyTrendChart';
import CategoryShareCharts from './CategoryShareCharts';

export default function MonthlyReportPage() {
  const { year, month } = useSelectionStore();
  const entries = useBudgetStore((s) => s.entries);

  const summary = monthlySummary(entries, year, month);
  const prev = previousMonth(year, month);
  const prevSummary = monthlySummary(entries, prev.year, prev.month);
  const dailyData = monthDailySummaries(entries, year, month);
  const categoryShare = monthExpenseByCategory(entries, year, month);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {year}년 {month}월 리포트
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          이번 달 요약, 전월 대비 변화, 일별 흐름과 카테고리별 지출 비중을 확인하세요.
        </p>
      </div>

      <SummaryCards summary={summary} />
      <MonthComparisonCards
        summary={summary}
        prevSummary={prevSummary}
        prevLabel={`${prev.year}년 ${prev.month}월`}
      />
      <MonthDailyTrendChart data={dailyData} />
      <CategoryShareCharts data={categoryShare} entries={entries} year={year} month={month} />
    </div>
  );
}
