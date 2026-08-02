import { useState } from 'react';
import type { SectionType } from '../../types';
import { SECTION_EMOJI, SECTION_LABELS, categoriesBySection } from '../../constants/categories';
import { useBudgetStore } from '../../store/useBudgetStore';
import { budgetFor } from '../../lib/calculations';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function BudgetCell({
  categoryId,
  year,
  month,
}: {
  categoryId: string;
  year: number;
  month: number;
}) {
  const budgets = useBudgetStore((s) => s.budgets);
  const setBudget = useBudgetStore((s) => s.setBudget);
  const stored = budgetFor(budgets, categoryId, year, month);
  const [value, setValue] = useState(stored ? String(stored) : '');

  return (
    <input
      className="w-full min-w-[72px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-1 py-1 text-right text-xs"
      value={value}
      placeholder="0"
      inputMode="numeric"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const parsed = Number(value.replace(/,/g, ''));
        setBudget(categoryId, year, month, Number.isFinite(parsed) ? parsed : 0);
      }}
    />
  );
}

export default function BudgetGrid({ section, year }: { section: SectionType; year: number }) {
  const categories = categoriesBySection(section);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <h2 className="mb-2 text-base font-bold text-gray-900 dark:text-gray-100">
        {SECTION_EMOJI[section]} {SECTION_LABELS[section]} — 월별 예산 입력
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[110px]" />
            {MONTHS.map((m) => (
              <col key={m} className="w-[72px]" />
            ))}
          </colgroup>
          <thead>
            <tr className="text-gray-500 dark:text-gray-400">
              <th className="sticky left-0 z-10 whitespace-nowrap bg-white dark:bg-gray-800 px-2 py-1 text-left">
                카테고리
              </th>
              {MONTHS.map((m) => (
                <th key={m} className="px-1 py-1 text-center">
                  {m}월
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white dark:bg-gray-800 px-2 py-1 font-medium text-gray-700 dark:text-gray-300">
                  {cat.emoji} {cat.name}
                </td>
                {MONTHS.map((m) => (
                  <td key={m} className="px-1 py-1">
                    <BudgetCell key={`${cat.id}-${year}-${m}`} categoryId={cat.id} year={year} month={m} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
