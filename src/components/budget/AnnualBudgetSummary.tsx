import type { SectionType } from '../../types';
import { SECTION_EMOJI, SECTION_LABELS, categoriesBySection } from '../../constants/categories';
import { useBudgetStore } from '../../store/useBudgetStore';
import { sectionAnnualTotal } from '../../lib/calculations';
import { formatPercent } from '../../lib/format';
import Money from '../common/Money';

const EXPENSE_SECTIONS: SectionType[] = ['fixed', 'saving', 'variable'];

function annualBudgetTotal(
  budgets: { categoryId: string; year: number; month: number; amount: number }[],
  categoryIds: Set<string>,
  year: number,
): number {
  return budgets
    .filter((b) => categoryIds.has(b.categoryId) && b.year === year)
    .reduce((sum, b) => sum + b.amount, 0);
}

export default function AnnualBudgetSummary({ year }: { year: number }) {
  const entries = useBudgetStore((s) => s.entries);
  const budgets = useBudgetStore((s) => s.budgets);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-2 text-base font-bold text-gray-900">{year}년 연간 예산 대비 실적</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="py-1">섹션</th>
              <th className="py-1 text-right">연간 예산</th>
              <th className="py-1 text-right">연간 실제</th>
              <th className="py-1 text-right">차이</th>
              <th className="py-1 text-right">달성률</th>
            </tr>
          </thead>
          <tbody>
            {EXPENSE_SECTIONS.map((section) => {
              const catIds = new Set(categoriesBySection(section).map((c) => c.id));
              const budgetTotal = annualBudgetTotal(budgets, catIds, year);
              const actualTotal = sectionAnnualTotal(entries, section, year);
              const over = budgetTotal > 0 && actualTotal / budgetTotal > 1;
              return (
                <tr key={section} className={`border-b border-gray-50 ${over ? 'bg-red-50' : ''}`}>
                  <td className="py-1.5 font-medium text-gray-700">
                    {SECTION_EMOJI[section]} {SECTION_LABELS[section]}
                  </td>
                  <td className="py-1.5 text-right">
                    <Money amount={budgetTotal} />
                  </td>
                  <td className="py-1.5 text-right">
                    <Money amount={actualTotal} />
                  </td>
                  <td className="py-1.5 text-right">
                    <Money amount={budgetTotal - actualTotal} />
                  </td>
                  <td className={`py-1.5 text-right font-semibold ${over ? 'text-red-600' : ''}`}>
                    {budgetTotal > 0 ? formatPercent(actualTotal / budgetTotal) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
