import { useEffect, useMemo, useState } from 'react';
import { useBudgetStore } from '../../store/useBudgetStore';
import { getBudgetAlerts, getUpcomingFixedExpenses } from '../../lib/alerts';
import Money from '../common/Money';

const NOTIFIED_KEY = 'budget-app:last-notified-date';

export default function AlertsPanel({ year, month }: { year: number; month: number }) {
  const entries = useBudgetStore((s) => s.entries);
  const budgets = useBudgetStore((s) => s.budgets);

  const budgetAlerts = useMemo(
    () => getBudgetAlerts(entries, budgets, year, month),
    [entries, budgets, year, month],
  );
  const upcoming = useMemo(
    () => getUpcomingFixedExpenses(entries, year, month, new Date()),
    [entries, year, month],
  );

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  useEffect(() => {
    if (permission !== 'granted') return;
    if (budgetAlerts.length === 0 && upcoming.length === 0) return;
    const todayKey = new Date().toDateString();
    if (localStorage.getItem(NOTIFIED_KEY) === todayKey) return;
    const lines = [
      ...budgetAlerts
        .slice(0, 2)
        .map((a) => `${a.emoji} ${a.categoryName} 예산 ${a.level === 'over' ? '초과' : '임박'}`),
      ...upcoming
        .slice(0, 2)
        .map((u) => `${u.emoji} ${u.label} ${u.daysUntil === 0 ? '오늘' : `D-${u.daysUntil}`}`),
    ];
    new Notification('가계부 알림', { body: lines.join('\n') });
    localStorage.setItem(NOTIFIED_KEY, todayKey);
  }, [permission, budgetAlerts, upcoming]);

  async function requestPermission() {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  const hasAlerts = budgetAlerts.length > 0 || upcoming.length > 0;

  if (!hasAlerts && permission !== 'default') return null;

  return (
    <div className="flex flex-col gap-2">
      {permission === 'default' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
          <span>
            🔔{' '}
            {hasAlerts
              ? '아래 알림을 브라우저 알림으로도 받아보시겠어요?'
              : '예산 초과나 결제 예정 알림을 브라우저 알림으로 받아보세요.'}
          </span>
          <button
            type="button"
            onClick={requestPermission}
            className="rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
          >
            알림 켜기
          </button>
        </div>
      )}
      {budgetAlerts.map((a) => (
        <div
          key={a.categoryId}
          className={`rounded-lg border px-4 py-2 text-sm ${
            a.level === 'over'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
              : 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300'
          }`}
        >
          {a.emoji} <strong>{a.categoryName}</strong>{' '}
          {a.level === 'over' ? '예산을 초과했습니다' : '예산이 얼마 남지 않았습니다'} (
          <Money amount={a.actual} /> / <Money amount={a.budget} />)
        </div>
      ))}
      {upcoming.map((u) => (
        <div
          key={u.entryId}
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
        >
          {u.emoji} <strong>{u.label}</strong>{' '}
          {u.daysUntil === 0 ? '오늘 결제 예정' : `${u.daysUntil}일 후 결제 예정`} (
          <Money amount={u.amount} />)
        </div>
      ))}
    </div>
  );
}
