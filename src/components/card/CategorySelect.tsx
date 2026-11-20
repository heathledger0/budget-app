import type { SectionType } from '../../types';
import { SECTION_LABELS, categoriesBySection } from '../../constants/categories';

const EXPENSE_SECTIONS: SectionType[] = ['fixed', 'variable'];

export default function CategorySelect({
  value,
  onChange,
  className,
  sections = EXPENSE_SECTIONS,
  emptyLabel = '미분류',
}: {
  value: string; // '' means no category picked (for card entries: stays purely in the card tracker)
  onChange: (categoryId: string) => void;
  className?: string;
  sections?: SectionType[];
  emptyLabel?: string;
}) {
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{emptyLabel}</option>
      {sections.map((section) => (
        <optgroup key={section} label={SECTION_LABELS[section]}>
          {categoriesBySection(section).map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
