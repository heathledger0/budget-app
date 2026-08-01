import type { SectionType } from '../../types';
import { SECTION_LABELS, categoriesBySection } from '../../constants/categories';
import { useBudgetStore } from '../../store/useBudgetStore';
import { budgetComparison, sectionBudgetTotal, sectionTotal } from '../../lib/calculations';
import { formatPercent } from '../../lib/format';
import Money from '../common/Money';

export default function BudgetComparisonTable({
  section,
  year,
  month,
}: {
  section: SectionType;
  year: number;
  month: number;
}) {
  const entries = useBudgetStore((s) => s.entries);
  const budgets = useBudgetStore((s) => s.budgets);
  const categories = categoriesBySection(section);

  const sectionBudget = sectionBudgetTotal(budgets, section, year, month);
  const sectionActual = sectionTotal(entries, section, year, month);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-2 text-base font-bold text-gray-900">
        {SECTION_LABELS[section]} — {month}월 예산 대비 실적
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="py-1">카테고리</th>
              <th className="py-1 text-right">예산</th>
              <th className="py-1 text-right">실제 지출</th>
              <th className="py-1 text-right">차이</th>
              <th className="py-1 text-right">달성률</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const c = budgetComparison(entries, budgets, cat.id, year, month);
              const over = c.achievement > 1;
              return (
                <tr key={cat.id} className={`border-b border-gray-50 ${over ? 'bg-red-50' : ''}`}>
                  <td className="py-1.5 font-medium text-gray-700">{cat.name}</td>
                  <td className="py-1.5 text-right">
                    <Money amount={c.budget} />
                  </td>
                  <td className="py-1.5 text-right">
                    <Money amount={c.actual} />
                  </td>
                  <td className="py-1.5 text-right">
                    <Money amount={c.diff} />
                  </td>
                  <td className={`py-1.5 text-right font-semibold ${over ? 'text-red-600' : ''}`}>
                    {formatPercent(c.achievement)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-bold">
              <td className="py-1.5">{SECTION_LABELS[section]} 합계</td>
              <td className="py-1.5 text-right">
                <Money amount={sectionBudget} />
              </td>
              <td className="py-1.5 text-right">
                <Money amount={sectionActual} />
              </td>
              <td className="py-1.5 text-right">
                <Money amount={sectionBudget - sectionActual} />
              </td>
              <td
                className={`py-1.5 text-right ${
                  sectionBudget > 0 && sectionActual / sectionBudget > 1 ? 'text-red-600' : ''
                }`}
              >
                {sectionBudget > 0 ? formatPercent(sectionActual / sectionBudget) : '-'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
