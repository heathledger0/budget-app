import { useSelectionStore } from '../../store/useSelectionStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import { annualExpenseByCategory, yearSummaries } from '../../lib/calculations';
import CategoryShareCharts from './CategoryShareCharts';
import MonthlySummaryTable from './MonthlySummaryTable';
import ExportSection from './ExportSection';

export default function ReportPage() {
  const { year } = useSelectionStore();
  const entries = useBudgetStore((s) => s.entries);
  const yearData = yearSummaries(entries, year);
  const categoryShare = annualExpenseByCategory(entries, year);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{year}년 연간 리포트</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          카테고리별 연간 지출 비중과 월별 요약, 연간 합계·월평균을 확인하세요.
        </p>
      </div>

      <CategoryShareCharts data={categoryShare} />
      <MonthlySummaryTable data={yearData} />
      <ExportSection />
    </div>
  );
}
