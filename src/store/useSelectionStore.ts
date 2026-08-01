import { create } from 'zustand';

const now = new Date();

interface SelectionState {
  year: number;
  month: number;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  setYear: (year) => set({ year }),
  setMonth: (month) => set({ month }),
}));
