import { useState } from 'react';
import type { SectionType } from '../../types';
import { SECTION_EMOJI, SECTION_LABELS } from '../../constants/categories';
import { useSelectionStore } from '../../store/useSelectionStore';
import BudgetGrid from './BudgetGrid';
import BudgetComparisonTable from './BudgetComparisonTable';
import AnnualBudgetSummary from './AnnualBudgetSummary';

const EXPENSE_SECTIONS: SectionType[] = ['fixed', 'saving', 'variable'];

export default function BudgetPage() {
  const { year, month } = useSelectionStore();
  const [activeSection, setActiveSection] = useState<SectionType>('fixed');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">예산 비교</h1>
        <p className="mt-1 text-sm text-gray-500">
          카테고리마다 월별로 다른 예산을 입력하고, 실제 지출과 비교합니다. 예산을 초과하면 빨간색으로 표시됩니다.
        </p>
      </div>

      <div className="flex gap-2">
        {EXPENSE_SECTIONS.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setActiveSection(section)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              activeSection === section
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {SECTION_EMOJI[section]} {SECTION_LABELS[section]}
          </button>
        ))}
      </div>

      <BudgetGrid section={activeSection} year={year} />
      <BudgetComparisonTable section={activeSection} year={year} month={month} />
      <AnnualBudgetSummary year={year} />
    </div>
  );
}
