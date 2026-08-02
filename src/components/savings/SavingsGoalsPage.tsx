import { useMemo, useState } from 'react';
import { useBudgetStore } from '../../store/useBudgetStore';
import { categoriesBySection, categoryById } from '../../constants/categories';
import { savingsGoalSaved } from '../../lib/calculations';
import Money from '../common/Money';
import { formatPercent } from '../../lib/format';

const SAVING_CATEGORIES = categoriesBySection('saving');

function daysUntil(targetDate: string): number {
  const target = new Date(`${targetDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function SavingsGoalsPage() {
  const entries = useBudgetStore((s) => s.entries);
  const savingsGoals = useBudgetStore((s) => s.savingsGoals);
  const addSavingsGoal = useBudgetStore((s) => s.addSavingsGoal);
  const removeSavingsGoal = useBudgetStore((s) => s.removeSavingsGoal);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(SAVING_CATEGORIES[0]?.id ?? '');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const goalsWithProgress = useMemo(
    () =>
      savingsGoals.map((goal) => {
        const saved = savingsGoalSaved(entries, goal);
        return {
          goal,
          saved,
          ratio: goal.targetAmount > 0 ? saved / goal.targetAmount : 0,
        };
      }),
    [savingsGoals, entries],
  );

  async function handleAdd() {
    const amount = Number(targetAmount);
    if (!name.trim() || !categoryId || !amount || amount <= 0) return;
    const now = new Date();
    await addSavingsGoal({
      name: name.trim(),
      categoryId,
      targetAmount: amount,
      startYear: now.getFullYear(),
      startMonth: now.getMonth() + 1,
      targetDate: targetDate || undefined,
    });
    setName('');
    setTargetAmount('');
    setTargetDate('');
  }

  async function handleRemove(id: string) {
    const confirmed = window.confirm('이 저축 목표를 삭제할까요? 지금까지 입력한 가계부 내역은 그대로 남습니다.');
    if (!confirmed) return;
    await removeSavingsGoal(id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">🎯 저축 목표</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          저축/투자 카테고리에 목표 금액을 걸어두면, 목표를 만든 달 이후 입력한 금액으로 진행률을 계산합니다.
        </p>
      </div>

      {goalsWithProgress.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-400 dark:text-gray-500">
          아직 등록한 저축 목표가 없어요. 아래에서 추가해보세요.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {goalsWithProgress.map(({ goal, saved, ratio }) => {
            const category = categoryById(goal.categoryId);
            const achieved = ratio >= 1;
            const pct = Math.min(ratio, 1) * 100;
            const remainingDays = goal.targetDate ? daysUntil(goal.targetDate) : null;
            return (
              <div
                key={goal.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {category?.emoji} {goal.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                      {category?.name} · {goal.startYear}.{goal.startMonth}부터
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(goal.id)}
                    className="text-xs text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                  >
                    삭제
                  </button>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full ${achieved ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    <Money amount={saved} /> / <Money amount={goal.targetAmount} />
                  </span>
                  <span className={`font-semibold ${achieved ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {achieved ? '🎉 목표 달성' : formatPercent(ratio)}
                  </span>
                </div>
                {remainingDays !== null && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {remainingDays > 0
                      ? `목표일까지 D-${remainingDays}`
                      : remainingDays === 0
                        ? '목표일이 오늘입니다'
                        : `목표일이 ${Math.abs(remainingDays)}일 지났습니다`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h2 className="mb-3 text-base font-bold text-gray-900 dark:text-gray-100">➕ 새 목표 추가</h2>
        <div className="flex flex-col gap-2">
          <input
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
            placeholder="목표 이름 (예: 신혼여행 자금)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {SAVING_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
            <input
              className="min-w-0 flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
              type="number"
              placeholder="목표 금액"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
            />
            <input
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="self-start rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            목표 추가
          </button>
        </div>
      </div>
    </div>
  );
}
