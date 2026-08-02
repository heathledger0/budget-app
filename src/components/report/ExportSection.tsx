import { useBudgetStore } from '../../store/useBudgetStore';
import { categoryById, SECTION_LABELS } from '../../constants/categories';
import { downloadCsv, todayStamp } from '../../lib/csvExport';

export default function ExportSection() {
  const entries = useBudgetStore((s) => s.entries);
  const budgets = useBudgetStore((s) => s.budgets);
  const cardEntries = useBudgetStore((s) => s.cardEntries);

  function exportEntries() {
    const rows: string[][] = [['연도', '월', '일', '섹션', '카테고리', '항목명', '금액', '메모']];
    for (const e of [...entries].sort(
      (a, b) => a.year - b.year || a.month - b.month || a.day - b.day,
    )) {
      const category = categoryById(e.categoryId);
      rows.push([
        String(e.year),
        String(e.month),
        String(e.day),
        category ? SECTION_LABELS[category.section] : '',
        category ? category.name : e.categoryId,
        e.label,
        String(e.amount),
        e.memo ?? '',
      ]);
    }
    downloadCsv(`budget-entries-${todayStamp()}.csv`, rows);
  }

  function exportBudgets() {
    const rows: string[][] = [['연도', '월', '섹션', '카테고리', '예산금액']];
    for (const b of [...budgets].sort((a, b) => a.year - b.year || a.month - b.month)) {
      const category = categoryById(b.categoryId);
      rows.push([
        String(b.year),
        String(b.month),
        category ? SECTION_LABELS[category.section] : '',
        category ? category.name : b.categoryId,
        String(b.amount),
      ]);
    }
    downloadCsv(`budget-plan-${todayStamp()}.csv`, rows);
  }

  function exportCardEntries() {
    const rows: string[][] = [['연도', '월', '사용처', '금액', '메모']];
    for (const c of [...cardEntries].sort((a, b) => a.year - b.year || a.month - b.month)) {
      rows.push([String(c.year), String(c.month), c.label, String(c.amount), c.memo ?? '']);
    }
    downloadCsv(`budget-card-${todayStamp()}.csv`, rows);
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <h2 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-100">
        📤 데이터 내보내기
      </h2>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        전체 기간의 데이터를 CSV 파일로 내려받습니다. 엑셀에서 바로 열 수 있어요.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportEntries}
          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
        >
          가계부 전체 내역
        </button>
        <button
          type="button"
          onClick={exportBudgets}
          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
        >
          예산 데이터
        </button>
        <button
          type="button"
          onClick={exportCardEntries}
          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
        >
          신용카드 내역
        </button>
      </div>
    </div>
  );
}
