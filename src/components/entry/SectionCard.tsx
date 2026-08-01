import type { SectionType } from '../../types';
import { SECTION_LABELS, categoriesBySection } from '../../constants/categories';
import { useBudgetStore } from '../../store/useBudgetStore';
import { sectionDayTotal } from '../../lib/calculations';
import Money from '../common/Money';
import CategoryRow from './CategoryRow';

export default function SectionCard({
  section,
  year,
  month,
  day,
}: {
  section: SectionType;
  year: number;
  month: number;
  day: number;
}) {
  const entries = useBudgetStore((s) => s.entries);
  const categories = categoriesBySection(section);
  const total = sectionDayTotal(entries, section, year, month, day);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">{SECTION_LABELS[section]}</h2>
        <span className="text-base font-bold">
          <Money amount={total} />
        </span>
      </div>
      <div>
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} year={year} month={month} day={day} />
        ))}
      </div>
    </div>
  );
}
