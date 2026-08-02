export type SectionType = 'income' | 'fixed' | 'saving' | 'variable';

export interface CategoryDef {
  id: string;
  name: string;
  section: SectionType;
  emoji: string;
}

export interface Entry {
  id: string;
  categoryId: string;
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  label: string;
  amount: number;
  memo?: string;
  seriesId?: string; // links recurring 고정지출 entries created together across months
}

export interface Budget {
  id: string;
  categoryId: string;
  year: number;
  month: number;
  amount: number;
}

export interface CardEntry {
  id: string;
  year: number;
  month: number;
  label: string;
  amount: number;
  memo?: string;
}

export interface SavingsGoal {
  id: string;
  categoryId: string;
  name: string;
  targetAmount: number;
  startYear: number;
  startMonth: number;
  targetDate?: string; // YYYY-MM-DD
}
