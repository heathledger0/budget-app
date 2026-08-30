import { useState } from 'react';
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
import { useThemeStore } from '../../store/useThemeStore';
import { categoryById, SECTION_EMOJI, SECTION_LABELS } from '../../constants/categories';
import type { Entry, SectionType } from '../../types';
import Money from '../common/Money';

const COLORS = [
  '#2563eb', '#f97316', '#10b981', '#a855f7', '#ef4444', '#06b6d4',
  '#eab308', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f43f5e',
  '#8b5cf6', '#0ea5e9', '#22c55e', '#d97706', '#db2777', '#4f46e5',
];

interface ChartRow {
  key: string;
  name: string;
  total: number;
  share: number; // relative to the combined 고정지출+변동지출 grand total
  section?: SectionType; // present on the top-level (section) rows
  categoryId?: string; // present on the category-level (detail) rows
}

function groupBySection(data: CategoryShare[]): ChartRow[] {
  const totals = new Map<SectionType, number>();
  for (const d of data) {
    const section = categoryById(d.categoryId)?.section;
    if (!section) continue;
    totals.set(section, (totals.get(section) ?? 0) + d.total);
  }
  const grandTotal = [...totals.values()].reduce((sum, v) => sum + v, 0);
  return [...totals.entries()]
    .map(([section, total]) => ({
      key: section,
      name: `${SECTION_EMOJI[section]} ${SECTION_LABELS[section]}`,
      total,
      share: grandTotal > 0 ? total / grandTotal : 0,
      section,
    }))
    .sort((a, b) => b.total - a.total);
}

export default function CategoryShareCharts({
  data,
  entries,
  year,
  month,
}: {
  data: CategoryShare[];
  /** When given (with `year`), clicking a category row drills down to its individual entries. */
  entries?: Entry[];
  year?: number;
  /** Omit for an annual view (lists the whole year's entries for the category); set for a single month. */
  month?: number;
}) {
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const [drilldown, setDrilldown] = useState<SectionType | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const tickColor = isDark ? '#9ca3af' : '#374151';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    border: `1px solid ${gridColor}`,
    color: isDark ? '#f3f4f6' : '#111827',
  };
  const withTotal = data.filter((d) => d.total > 0);
  const canListItems = Boolean(entries && year !== undefined);

  const sectionRows = groupBySection(withTotal);
  const detailRows: ChartRow[] = withTotal
    .filter((d) => categoryById(d.categoryId)?.section === drilldown)
    .sort((a, b) => b.total - a.total)
    .map((d) => ({ key: d.categoryId, name: d.name, total: d.total, share: d.share, categoryId: d.categoryId }));

  const chartRows = drilldown ? detailRows : sectionRows;
  const drilldownLabel = drilldown ? `${SECTION_EMOJI[drilldown]} ${SECTION_LABELS[drilldown]}` : null;
  const selectedCategory = selectedCategoryId ? categoryById(selectedCategoryId) : undefined;

  const categoryEntries =
    selectedCategoryId && entries && year !== undefined
      ? entries
          .filter(
            (e) =>
              e.categoryId === selectedCategoryId &&
              e.year === year &&
              (month === undefined || e.month === month),
          )
          .sort((a, b) => (month === undefined ? a.month - b.month || a.day - b.day : a.day - b.day))
      : [];
  const categoryEntriesTotal = categoryEntries.reduce((sum, e) => sum + e.amount, 0);

  function handleChartClick(entry: { payload?: ChartRow }) {
    const row = entry.payload;
    if (!row) return;
    if (!drilldown && row.section) {
      setDrilldown(row.section);
    } else if (drilldown && !selectedCategoryId && row.categoryId && canListItems) {
      setSelectedCategoryId(row.categoryId);
    }
  }

  function goBack() {
    if (selectedCategoryId) setSelectedCategoryId(null);
    else setDrilldown(null);
  }

  if (sectionRows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-500 dark:text-gray-400">
        표시할 지출 데이터가 없습니다.
      </div>
    );
  }

  if (selectedCategoryId) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950"
          >
            ← {drilldownLabel} 세부 비중으로
          </button>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {selectedCategory ? `${selectedCategory.emoji} ${selectedCategory.name}` : ''}
            {month !== undefined ? ` ${month}월` : ''} 내역
          </h2>
        </div>
        {categoryEntries.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="py-1">날짜</th>
                  <th className="py-1">항목명</th>
                  <th className="py-1">메모</th>
                  <th className="py-1 text-right">금액</th>
                </tr>
              </thead>
              <tbody>
                {categoryEntries.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 dark:border-gray-700">
                    <td className="py-1.5 whitespace-nowrap">{month === undefined ? `${e.month}/${e.day}` : `${e.day}일`}</td>
                    <td className="py-1.5">{e.label}</td>
                    <td className="py-1.5 text-gray-400 dark:text-gray-500">{e.memo ?? ''}</td>
                    <td className="py-1.5 text-right"><Money amount={e.amount} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold">
                  <td className="py-1.5" colSpan={3}>합계</td>
                  <td className="py-1.5 text-right"><Money amount={categoryEntriesTotal} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="mb-3 flex items-center gap-2">
          {drilldown ? (
            <>
              <button
                type="button"
                onClick={goBack}
                className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950"
              >
                ← 전체보기
              </button>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {drilldownLabel} 세부 지출 (막대)
                {canListItems ? ' · 항목을 클릭하면 내역을 볼 수 있어요' : ''}
              </h2>
            </>
          ) : (
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              카테고리별 지출 (막대) · 항목을 클릭하면 세부 내역을 볼 수 있어요
            </h2>
          )}
        </div>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} layout="vertical" margin={{ left: 24, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: tickColor }}
                tickFormatter={(v) => formatWon(v)}
              />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: tickColor }} />
              <Tooltip
                formatter={(value, _name, item) => [
                  `${formatWon(Number(value))} (전체의 ${formatPercent(item.payload.share)})`,
                  '연간 지출',
                ]}
                contentStyle={tooltipStyle}
              />
              <Bar
                dataKey="total"
                name="연간 지출"
                onClick={handleChartClick}
                cursor={!drilldown || canListItems ? 'pointer' : 'default'}
              >
                {chartRows.map((row, i) => (
                  <Cell key={row.key} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="mb-3 flex items-center gap-2">
          {drilldown ? (
            <>
              <button
                type="button"
                onClick={goBack}
                className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950"
              >
                ← 전체보기
              </button>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {drilldownLabel} 세부 비중 (파이)
                {canListItems ? ' · 조각을 클릭하면 내역을 볼 수 있어요' : ''}
              </h2>
            </>
          ) : (
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              카테고리별 비중 (파이) · 조각을 클릭하면 세부 내역을 볼 수 있어요
            </h2>
          )}
        </div>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartRows}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="70%"
                onClick={handleChartClick}
                cursor={!drilldown || canListItems ? 'pointer' : 'default'}
                label={(props: { name?: string; percent?: number; share?: number }) =>
                  `${props.name ?? ''} ${formatPercent(props.share ?? props.percent ?? 0)}`
                }
              >
                {chartRows.map((row, i) => (
                  <Cell key={row.key} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, item) => [
                  `${formatWon(Number(value))} (전체의 ${formatPercent(item.payload.share)})`,
                  '연간 지출',
                ]}
                contentStyle={tooltipStyle}
              />
              <Legend wrapperStyle={{ color: tickColor }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
