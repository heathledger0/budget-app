import { CATEGORIES, categoriesBySection } from '../constants/categories';
import type { Budget, Entry, SectionType } from '../types';

export interface MonthlySummary {
  year: number;
  month: number;
  income: number;
  fixed: number;
  saving: number;
  variable: number;
  totalExpense: number;
  netBalance: number;
}

export function categoryTotal(
  entries: Entry[],
  categoryId: string,
  year: number,
  month: number,
): number {
  return entries
    .filter((e) => e.categoryId === categoryId && e.year === year && e.month === month)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function categoryDayTotal(
  entries: Entry[],
  categoryId: string,
  year: number,
  month: number,
  day: number,
): number {
  return entries
    .filter(
      (e) => e.categoryId === categoryId && e.year === year && e.month === month && e.day === day,
    )
    .reduce((sum, e) => sum + e.amount, 0);
}

export function categoryAnnualTotal(entries: Entry[], categoryId: string, year: number): number {
  return entries
    .filter((e) => e.categoryId === categoryId && e.year === year)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function sectionTotal(
  entries: Entry[],
  section: SectionType,
  year: number,
  month: number,
): number {
  const ids = new Set(categoriesBySection(section).map((c) => c.id));
  return entries
    .filter((e) => ids.has(e.categoryId) && e.year === year && e.month === month)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function sectionDayTotal(
  entries: Entry[],
  section: SectionType,
  year: number,
  month: number,
  day: number,
): number {
  const ids = new Set(categoriesBySection(section).map((c) => c.id));
  return entries
    .filter((e) => ids.has(e.categoryId) && e.year === year && e.month === month && e.day === day)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function sectionAnnualTotal(entries: Entry[], section: SectionType, year: number): number {
  const ids = new Set(categoriesBySection(section).map((c) => c.id));
  return entries
    .filter((e) => ids.has(e.categoryId) && e.year === year)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function monthlySummary(entries: Entry[], year: number, month: number): MonthlySummary {
  const income = sectionTotal(entries, 'income', year, month);
  const fixed = sectionTotal(entries, 'fixed', year, month);
  const saving = sectionTotal(entries, 'saving', year, month);
  const variable = sectionTotal(entries, 'variable', year, month);
  const totalExpense = fixed + saving + variable;
  return {
    year,
    month,
    income,
    fixed,
    saving,
    variable,
    totalExpense,
    netBalance: income - totalExpense,
  };
}

export function yearSummaries(entries: Entry[], year: number): MonthlySummary[] {
  return Array.from({ length: 12 }, (_, i) => monthlySummary(entries, year, i + 1));
}

export interface CategoryShare {
  categoryId: string;
  name: string;
  total: number;
  share: number; // 0-1, relative to combined 고정지출+변동지출
}

export function annualExpenseByCategory(entries: Entry[], year: number): CategoryShare[] {
  const expenseCategories = CATEGORIES.filter(
    (c) => c.section === 'fixed' || c.section === 'variable',
  );
  const totals = expenseCategories.map((c) => ({
    categoryId: c.id,
    name: c.name,
    total: categoryAnnualTotal(entries, c.id, year),
  }));
  const grandTotal = totals.reduce((sum, t) => sum + t.total, 0);
  return totals.map((t) => ({
    ...t,
    share: grandTotal > 0 ? t.total / grandTotal : 0,
  }));
}

export interface BudgetComparison {
  categoryId: string;
  year: number;
  month: number;
  budget: number;
  actual: number;
  diff: number; // budget - actual
  achievement: number; // actual / budget, Infinity if budget 0 and actual > 0
}

export function budgetFor(
  budgets: Budget[],
  categoryId: string,
  year: number,
  month: number,
): number {
  return (
    budgets.find((b) => b.categoryId === categoryId && b.year === year && b.month === month)
      ?.amount ?? 0
  );
}

export function budgetComparison(
  entries: Entry[],
  budgets: Budget[],
  categoryId: string,
  year: number,
  month: number,
): BudgetComparison {
  const budget = budgetFor(budgets, categoryId, year, month);
  const actual = categoryTotal(entries, categoryId, year, month);
  return {
    categoryId,
    year,
    month,
    budget,
    actual,
    diff: budget - actual,
    achievement: budget > 0 ? actual / budget : actual > 0 ? Infinity : 0,
  };
}

export function sectionBudgetTotal(
  budgets: Budget[],
  section: SectionType,
  year: number,
  month: number,
): number {
  const ids = new Set(categoriesBySection(section).map((c) => c.id));
  return budgets
    .filter((b) => ids.has(b.categoryId) && b.year === year && b.month === month)
    .reduce((sum, b) => sum + b.amount, 0);
}

export function categoryAnnualBudget(budgets: Budget[], categoryId: string, year: number): number {
  return budgets
    .filter((b) => b.categoryId === categoryId && b.year === year)
    .reduce((sum, b) => sum + b.amount, 0);
}
