import { useMemo, useState } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import {
  monthDailySummaries,
  monthExpenseByCategory,
  monthlySummary,
  previousMonth,
} from '../../lib/calculations';
import { isOneOffCategory } from '../../constants/categories';
import SummaryCards from '../dashboard/SummaryCards';
import MonthComparisonCards from './MonthComparisonCards';
import MonthDailyTrendChart from './MonthDailyTrendChart';
import CategoryShareCharts from './CategoryShareCharts';

export default function MonthlyReportPage() {
  const { year, month } = useSelectionStore();
  const entries = useBudgetStore((s) => s.entries);
  const [excludeOneOff, setExcludeOneOff] = useState(true);

  const hasOneOffThisMonth = entries.some(
    (e) => e.year === year && e.month === month && isOneOffCategory(e.categoryId),
  );
  const reportEntries = useMemo(
    () => (excludeOneOff ? entries.filter((e) => !isOneOffCategory(e.categoryId)) : entries),
    [entries, excludeOneOff],
  );

  const summary = monthlySummary(reportEntries, year, month);
  const prev = previousMonth(year, month);
  const prevSummary = monthlySummary(reportEntries, prev.year, prev.month);
  const dailyData = monthDailySummaries(reportEntries, year, month);
  const categoryShare = monthExpenseByCategory(reportEntries, year, month);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {year}년 {month}월 리포트
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            이번 달 요약, 전월 대비 변화, 일별 흐름과 카테고리별 지출 비중을 확인하세요.
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={excludeOneOff}
            onChange={(e) => setExcludeOneOff(e.target.checked)}
          />
          🏠 보증금 등 1회성 큰 항목 제외
          {hasOneOffThisMonth && excludeOneOff && (
            <span className="text-xs text-blue-600 dark:text-blue-400">(이번 달 적용 중)</span>
          )}
        </label>
      </div>

      <SummaryCards summary={summary} />
      <MonthComparisonCards
        summary={summary}
        prevSummary={prevSummary}
        prevLabel={`${prev.year}년 ${prev.month}월`}
      />
      <MonthDailyTrendChart data={dailyData} />
      <CategoryShareCharts data={categoryShare} entries={reportEntries} year={year} month={month} />
    </div>
  );
}
