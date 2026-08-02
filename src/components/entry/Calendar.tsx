import { useMemo } from 'react';
import type { Entry } from '../../types';
import { daysInMonth } from '../../lib/calculations';
import { categoryById } from '../../constants/categories';
import Money from '../common/Money';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function Calendar({
  year,
  month,
  selectedDay,
  onSelectDay,
  entries,
}: {
  year: number;
  month: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  entries: Entry[];
}) {
  const total = daysInMonth(year, month);
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const monthEntries = useMemo(
    () => entries.filter((e) => e.year === year && e.month === month),
    [entries, year, month],
  );

  const fixedEntriesThisMonth = useMemo(
    () =>
      monthEntries
        .filter((e) => categoryById(e.categoryId)?.section === 'fixed')
        .sort((a, b) => a.day - b.day || a.label.localeCompare(b.label)),
    [monthEntries],
  );

  const fixedDays = useMemo(() => {
    const set = new Set<number>();
    for (const e of fixedEntriesThisMonth) set.add(e.day);
    return set;
  }, [fixedEntriesThisMonth]);

  const otherDays = useMemo(() => {
    const set = new Set<number>();
    for (const e of monthEntries) {
      if (categoryById(e.categoryId)?.section !== 'fixed') set.add(e.day);
    }
    return set;
  }, [monthEntries]);

  const cells = useMemo(() => {
    const arr: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
    for (let d = 1; d <= total; d++) arr.push(d);
    return arr;
  }, [firstWeekday, total]);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="mb-2 grid grid-cols-7 text-center text-xs text-gray-400 dark:text-gray-500">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {cells.map((day, i) =>
          day === null ? (
            <div key={`blank-${i}`} />
          ) : (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-full transition-colors ${
                day === selectedDay
                  ? 'bg-blue-600 text-white font-semibold'
                  : isCurrentMonth && day === today.getDate()
                    ? 'ring-1 ring-blue-400 text-gray-900 dark:text-gray-100'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <span>{day}</span>
              {fixedDays.has(day) ? (
                <span
                  className={`-mt-1 h-1 w-1 rounded-full ${
                    day === selectedDay ? 'bg-white' : 'bg-orange-500'
                  }`}
                />
              ) : (
                otherDays.has(day) && (
                  <span
                    className={`-mt-1 h-1 w-1 rounded-full ${
                      day === selectedDay ? 'bg-white' : 'bg-blue-500'
                    }`}
                  />
                )
              )}
            </button>
          ),
        )}
      </div>

      {fixedEntriesThisMonth.length > 0 && (
        <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />이 달 고정지출 일정
          </div>
          <div className="flex flex-wrap gap-1.5">
            {fixedEntriesThisMonth.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onSelectDay(e.day)}
                className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                  e.day === selectedDay
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900'
                }`}
              >
                {e.day}일 {categoryById(e.categoryId)?.emoji} {categoryById(e.categoryId)?.name} ·{' '}
                {e.label} ·{' '}
                <Money amount={e.amount} className={e.day === selectedDay ? 'text-white' : ''} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
