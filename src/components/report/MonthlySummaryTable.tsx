import type { MonthlySummary } from '../../lib/calculations';
import Money from '../common/Money';

export default function MonthlySummaryTable({ data }: { data: MonthlySummary[] }) {
  const totals = data.reduce(
    (acc, d) => ({
      income: acc.income + d.income,
      fixed: acc.fixed + d.fixed,
      saving: acc.saving + d.saving,
      variable: acc.variable + d.variable,
      totalExpense: acc.totalExpense + d.totalExpense,
      netBalance: acc.netBalance + d.netBalance,
    }),
    { income: 0, fixed: 0, saving: 0, variable: 0, totalExpense: 0, netBalance: 0 },
  );
  const monthCount = data.length || 1;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <h2 className="mb-3 text-base font-bold text-gray-900 dark:text-gray-100">월별 요약</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400">
              <th className="py-1">월</th>
              <th className="py-1 text-right">수입</th>
              <th className="py-1 text-right">고정지출</th>
              <th className="py-1 text-right">저축/투자</th>
              <th className="py-1 text-right">변동지출</th>
              <th className="py-1 text-right">총지출</th>
              <th className="py-1 text-right">순잔액</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month} className="border-b border-gray-50 dark:border-gray-700">
                <td className="py-1.5">{d.month}월</td>
                <td className="py-1.5 text-right"><Money amount={d.income} /></td>
                <td className="py-1.5 text-right"><Money amount={d.fixed} /></td>
                <td className="py-1.5 text-right"><Money amount={d.saving} /></td>
                <td className="py-1.5 text-right"><Money amount={d.variable} /></td>
                <td className="py-1.5 text-right"><Money amount={d.totalExpense} /></td>
                <td className="py-1.5 text-right"><Money amount={d.netBalance} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold">
              <td className="py-1.5">연간 합계</td>
              <td className="py-1.5 text-right"><Money amount={totals.income} /></td>
              <td className="py-1.5 text-right"><Money amount={totals.fixed} /></td>
              <td className="py-1.5 text-right"><Money amount={totals.saving} /></td>
              <td className="py-1.5 text-right"><Money amount={totals.variable} /></td>
              <td className="py-1.5 text-right"><Money amount={totals.totalExpense} /></td>
              <td className="py-1.5 text-right"><Money amount={totals.netBalance} /></td>
            </tr>
            <tr className="text-gray-500 dark:text-gray-400">
              <td className="py-1.5">월평균</td>
              <td className="py-1.5 text-right"><Money amount={totals.income / monthCount} /></td>
              <td className="py-1.5 text-right"><Money amount={totals.fixed / monthCount} /></td>
              <td className="py-1.5 text-right"><Money amount={totals.saving / monthCount} /></td>
              <td className="py-1.5 text-right"><Money amount={totals.variable / monthCount} /></td>
              <td className="py-1.5 text-right"><Money amount={totals.totalExpense / monthCount} /></td>
              <td className="py-1.5 text-right"><Money amount={totals.netBalance / monthCount} /></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
