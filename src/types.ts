export type SectionType = 'income' | 'fixed' | 'saving' | 'variable';

export interface CategoryDef {
  id: string;
  name: string;
  section: SectionType;
}

export interface Entry {
  id: string;
  categoryId: string;
  year: number;
  month: number; // 1-12
  label: string;
  amount: number;
  memo?: string;
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
