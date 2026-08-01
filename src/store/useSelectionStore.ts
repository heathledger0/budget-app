import { create } from 'zustand';

const now = new Date();

interface SelectionState {
  year: number;
  month: number;
  day: number;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  setDay: (day: number) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  setYear: (year) => set({ year }),
  setMonth: (month) => set({ month }),
  setDay: (day) => set({ day }),
}));
