import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailySummary } from '../../lib/calculations';
import { formatWon } from '../../lib/format';
import { useThemeStore } from '../../store/useThemeStore';

export default function MonthDailyTrendChart({ data }: { data: DailySummary[] }) {
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const tickColor = isDark ? '#9ca3af' : '#374151';
  const chartData = data.map((d) => ({ ...d, dayLabel: `${d.day}일` }));

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <h2 className="mb-3 text-base font-bold text-gray-900 dark:text-gray-100">일별 수입/지출</h2>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="dayLabel" tick={{ fontSize: 10, fill: tickColor }} />
            <YAxis tick={{ fontSize: 11, fill: tickColor }} tickFormatter={(v) => formatWon(v)} width={90} />
            <Tooltip
              formatter={(value) => formatWon(Number(value))}
              contentStyle={{
                backgroundColor: isDark ? '#1f2937' : '#fff',
                border: `1px solid ${gridColor}`,
                color: isDark ? '#f3f4f6' : '#111827',
              }}
            />
            <Legend wrapperStyle={{ color: tickColor }} />
            <Bar dataKey="income" name="수입" fill="#2563eb" />
            <Bar dataKey="totalExpense" name="총지출" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
