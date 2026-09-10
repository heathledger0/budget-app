import { useMemo, useState } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import { annualExpenseByCategory, withCardEntries, yearSummaries } from '../../lib/calculations';
import { isOneOffCategory } from '../../constants/categories';
import CategoryShareCharts from './CategoryShareCharts';
import MonthlySummaryTable from './MonthlySummaryTable';
import ExportSection from './ExportSection';
import ImportSection from './ImportSection';

export default function ReportPage() {
  const { year } = useSelectionStore();
  const entries = useBudgetStore((s) => s.entries);
  const cardEntries = useBudgetStore((s) => s.cardEntries);
  const [excludeOneOff, setExcludeOneOff] = useState(true);

  const combinedEntries = useMemo(
    () => withCardEntries(entries, cardEntries),
    [entries, cardEntries],
  );
  const hasOneOffThisYear = combinedEntries.some(
    (e) => e.year === year && isOneOffCategory(e.categoryId),
  );
  const reportEntries = useMemo(
    () =>
      excludeOneOff ? combinedEntries.filter((e) => !isOneOffCategory(e.categoryId)) : combinedEntries,
    [combinedEntries, excludeOneOff],
  );

  const yearData = yearSummaries(reportEntries, year);
  const categoryShare = annualExpenseByCategory(reportEntries, year);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{year}년 연간 리포트</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            카테고리별 연간 지출 비중과 월별 요약, 연간 합계·월평균을 확인하세요.
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={excludeOneOff}
            onChange={(e) => setExcludeOneOff(e.target.checked)}
          />
          🏠 보증금 등 1회성 큰 항목 제외
          {hasOneOffThisYear && excludeOneOff && (
            <span className="text-xs text-blue-600 dark:text-blue-400">(올해 적용 중)</span>
          )}
        </label>
      </div>

      <CategoryShareCharts data={categoryShare} entries={reportEntries} year={year} />
      <MonthlySummaryTable data={yearData} />
      <ExportSection />
      <ImportSection />
    </div>
  );
}
