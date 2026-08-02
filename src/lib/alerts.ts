import { CATEGORIES, categoriesBySection, categoryById } from '../constants/categories';
import type { Budget, Entry } from '../types';
import { budgetComparison } from './calculations';

export interface BudgetAlert {
  categoryId: string;
  categoryName: string;
  emoji: string;
  budget: number;
  actual: number;
  achievement: number;
  level: 'over' | 'near';
}

const NEAR_THRESHOLD = 0.9;

export function getBudgetAlerts(
  entries: Entry[],
  budgets: Budget[],
  year: number,
  month: number,
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  for (const category of CATEGORIES) {
    const cmp = budgetComparison(entries, budgets, category.id, year, month);
    if (cmp.budget <= 0) continue;
    if (cmp.achievement >= 1) {
      alerts.push({
        categoryId: category.id,
        categoryName: category.name,
        emoji: category.emoji,
        budget: cmp.budget,
        actual: cmp.actual,
        achievement: cmp.achievement,
        level: 'over',
      });
    } else if (cmp.achievement >= NEAR_THRESHOLD) {
      alerts.push({
        categoryId: category.id,
        categoryName: category.name,
        emoji: category.emoji,
        budget: cmp.budget,
        actual: cmp.actual,
        achievement: cmp.achievement,
        level: 'near',
      });
    }
  }
  return alerts.sort((a, b) => b.achievement - a.achievement);
}

export interface UpcomingFixedExpense {
  entryId: string;
  label: string;
  emoji: string;
  amount: number;
  day: number;
  daysUntil: number;
}

const UPCOMING_WINDOW_DAYS = 3;

// 오늘이 조회 중인 연/월과 같을 때만 의미가 있으므로, 다른 달을 보고 있으면 빈 배열을 반환합니다.
export function getUpcomingFixedExpenses(
  entries: Entry[],
  year: number,
  month: number,
  today: Date,
): UpcomingFixedExpense[] {
  if (today.getFullYear() !== year || today.getMonth() + 1 !== month) return [];
  const todayDay = today.getDate();
  const fixedIds = new Set(categoriesBySection('fixed').map((c) => c.id));
  return entries
    .filter(
      (e) =>
        fixedIds.has(e.categoryId) &&
        e.year === year &&
        e.month === month &&
        e.day >= todayDay &&
        e.day <= todayDay + UPCOMING_WINDOW_DAYS,
    )
    .map((e) => {
      const category = categoryById(e.categoryId);
      return {
        entryId: e.id,
        label: e.label,
        emoji: category?.emoji ?? '',
        amount: e.amount,
        day: e.day,
        daysUntil: e.day - todayDay,
      };
    })
    .sort((a, b) => a.day - b.day);
}
