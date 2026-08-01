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

const SERIES = [
  { key: 'income', name: '수입', color: '#2563eb' },
  { key: 'fixed', name: '고정지출', color: '#f97316' },
  { key: 'saving', name: '저축/투자', color: '#10b981' },
  { key: 'variable', name: '변동지출', color: '#a855f7' },
  { key: 'totalExpense', name: '총지출', color: '#ef4444' },
  { key: 'netBalance', name: '순잔액', color: '#111827' },
] as const;

export default function YearTrendChart({ data }: { data: MonthlySummary[] }) {
  const chartData = data.map((d) => ({ ...d, monthLabel: `${d.month}월` }));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-base font-bold text-gray-900">12개월 추이</h2>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatWon(v)} width={90} />
            <Tooltip formatter={(value) => formatWon(Number(value))} />
            <Legend />
            {SERIES.map((s) => (
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
