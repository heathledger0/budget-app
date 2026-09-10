import type { SectionType } from '../../types';
import { SECTION_LABELS, categoriesBySection } from '../../constants/categories';

const EXPENSE_SECTIONS: SectionType[] = ['fixed', 'variable'];

export default function CategorySelect({
  value,
  onChange,
  className,
}: {
  value: string; // '' means uncategorized (stays purely in the card tracker)
  onChange: (categoryId: string) => void;
  className?: string;
}) {
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">미분류</option>
      {EXPENSE_SECTIONS.map((section) => (
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
