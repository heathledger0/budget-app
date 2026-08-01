import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabaseClient';

const NAV_ITEMS = [
  { to: '/', label: '대시보드', emoji: '📊', end: true },
  { to: '/entry', label: '월별 입력', emoji: '📝' },
  { to: '/budget', label: '예산 비교', emoji: '⚖️' },
  { to: '/report', label: '연간 리포트', emoji: '📈' },
  { to: '/card', label: '신용카드', emoji: '💳' },
];

export default function Sidebar() {
  const email = useAuthStore((s) => s.session?.user.email);

  return (
    <nav className="flex md:w-56 md:flex-col gap-1 border-b md:border-b-0 md:border-r border-gray-200 bg-white p-3 md:min-h-screen overflow-x-auto">
      <div className="hidden md:block px-2 py-3 text-lg font-bold text-gray-900">가계부 관리</div>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
        >
          {item.emoji} {item.label}
        </NavLink>
      ))}
      {email && (
        <div className="mt-auto hidden md:block px-2 pt-4">
          <div className="mb-2 truncate text-xs text-gray-400">{email}</div>
          <button
            type="button"
            onClick={() => supabase?.auth.signOut()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            로그아웃
          </button>
        </div>
      )}
    </nav>
  );
}
