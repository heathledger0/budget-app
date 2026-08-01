import { useSelectionStore } from '../../store/useSelectionStore';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabaseClient';

const YEAR_RANGE = 6;

export default function Header() {
  const { year, month, setYear, setMonth } = useSelectionStore();
  const email = useAuthStore((s) => s.session?.user.email);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: YEAR_RANGE }, (_, i) => currentYear - YEAR_RANGE + 2 + i);

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="md:hidden text-lg font-bold text-gray-900">가계부 관리</div>
      <div className="ml-auto flex items-center gap-2">
        {email && (
          <button
            type="button"
            onClick={() => supabase?.auth.signOut()}
            className="md:hidden rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-600"
          >
            로그아웃
          </button>
        )}
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
