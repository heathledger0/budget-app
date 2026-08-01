import { useMemo } from 'react';
import type { Entry } from '../../types';
import { daysInMonth } from '../../lib/calculations';

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

  const daysWithEntries = useMemo(() => {
    const set = new Set<number>();
    for (const e of entries) {
      if (e.year === year && e.month === month) set.add(e.day);
    }
    return set;
  }, [entries, year, month]);

  const cells = useMemo(() => {
    const arr: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
    for (let d = 1; d <= total; d++) arr.push(d);
    return arr;
  }, [firstWeekday, total]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 grid grid-cols-7 text-center text-xs text-gray-400">
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
                    ? 'ring-1 ring-blue-400 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{day}</span>
              {daysWithEntries.has(day) && (
                <span
                  className={`-mt-1 h-1 w-1 rounded-full ${
                    day === selectedDay ? 'bg-white' : 'bg-blue-500'
                  }`}
                />
              )}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
