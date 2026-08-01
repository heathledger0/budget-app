import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoryShare } from '../../lib/calculations';
import { formatPercent, formatWon } from '../../lib/format';

const COLORS = [
  '#2563eb', '#f97316', '#10b981', '#a855f7', '#ef4444', '#06b6d4',
  '#eab308', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f43f5e',
  '#8b5cf6', '#0ea5e9', '#22c55e', '#d97706', '#db2777', '#4f46e5',
];

export default function CategoryShareCharts({ data }: { data: CategoryShare[] }) {
  const sorted = [...data].filter((d) => d.total > 0).sort((a, b) => b.total - a.total);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
        표시할 지출 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-bold text-gray-900">카테고리별 지출 (막대)</h2>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted} layout="vertical" margin={{ left: 24, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatWon(v)} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatWon(Number(value))} />
              <Bar dataKey="total" name="연간 지출">
                {sorted.map((entry, i) => (
                  <Cell key={entry.categoryId} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-bold text-gray-900">카테고리별 비중 (파이)</h2>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sorted}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="70%"
                label={(props: { name?: string; percent?: number }) =>
                  `${props.name ?? ''} ${formatPercent(props.percent ?? 0)}`
                }
              >
                {sorted.map((entry, i) => (
                  <Cell key={entry.categoryId} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatWon(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
