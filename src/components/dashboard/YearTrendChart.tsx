import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlySummary } from '../../lib/calculations';
import { formatWon } from '../../lib/format';
import { useThemeStore } from '../../store/useThemeStore';

function seriesFor(isDark: boolean) {
  return [
    { key: 'income', name: '수입', color: '#2563eb' },
    { key: 'fixed', name: '고정지출', color: '#f97316' },
    { key: 'saving', name: '저축/투자', color: '#10b981' },
    { key: 'variable', name: '변동지출', color: '#a855f7' },
    { key: 'totalExpense', name: '총지출', color: '#ef4444' },
    { key: 'netBalance', name: '순잔액', color: isDark ? '#e5e7eb' : '#111827' },
  ] as const;
}

export default function YearTrendChart({ data }: { data: MonthlySummary[] }) {
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const chartData = data.map((d) => ({ ...d, monthLabel: `${d.month}월` }));
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const tickColor = isDark ? '#9ca3af' : '#374151';

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <h2 className="mb-3 text-base font-bold text-gray-900 dark:text-gray-100">12개월 추이</h2>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 12, fill: tickColor }} />
            <YAxis
              tick={{ fontSize: 12, fill: tickColor }}
              tickFormatter={(v) => formatWon(v)}
              width={90}
            />
            <Tooltip
              formatter={(value) => formatWon(Number(value))}
              contentStyle={{
                backgroundColor: isDark ? '#1f2937' : '#fff',
                border: `1px solid ${gridColor}`,
                color: isDark ? '#f3f4f6' : '#111827',
              }}
            />
            <Legend wrapperStyle={{ color: tickColor }} />
            {seriesFor(isDark).map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
