import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
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
  const { theme, toggleTheme } = useThemeStore();

  return (
    <nav className="flex md:w-56 md:flex-col gap-1 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 md:min-h-screen overflow-x-auto">
      <div className="hidden md:flex items-center justify-between px-2 py-3">
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">가계부 관리</span>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="다크모드 전환"
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100'
            }`
          }
        >
          {item.emoji} {item.label}
        </NavLink>
      ))}
      {email && (
        <div className="mt-auto hidden md:block px-2 pt-4">
          <div className="mb-2 truncate text-xs text-gray-400 dark:text-gray-500">{email}</div>
          <button
            type="button"
            onClick={() => supabase?.auth.signOut()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
          >
            로그아웃
          </button>
        </div>
      )}
    </nav>
  );
}
