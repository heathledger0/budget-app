import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from './useAuthStore';
import type { Budget, CardEntry, Entry } from '../types';

interface EntryRow {
  id: string;
  category_id: string;
  year: number;
  month: number;
  label: string;
  amount: number;
  memo: string | null;
}
interface BudgetRow {
  id: string;
  category_id: string;
  year: number;
  month: number;
  amount: number;
}
interface CardEntryRow {
  id: string;
  year: number;
  month: number;
  label: string;
  amount: number;
  memo: string | null;
}

const fromEntryRow = (row: EntryRow): Entry => ({
  id: row.id,
  categoryId: row.category_id,
  year: row.year,
  month: row.month,
  label: row.label,
  amount: Number(row.amount),
  memo: row.memo ?? undefined,
});

const fromBudgetRow = (row: BudgetRow): Budget => ({
  id: row.id,
  categoryId: row.category_id,
  year: row.year,
  month: row.month,
  amount: Number(row.amount),
});

const fromCardEntryRow = (row: CardEntryRow): CardEntry => ({
  id: row.id,
  year: row.year,
  month: row.month,
  label: row.label,
  amount: Number(row.amount),
  memo: row.memo ?? undefined,
});

interface BudgetState {
  entries: Entry[];
  budgets: Budget[];
  cardEntries: CardEntry[];
  loading: boolean;

  loadAll: () => Promise<void>;
  reset: () => void;

  addEntry: (entry: Omit<Entry, 'id'>) => Promise<void>;
  updateEntry: (id: string, patch: Omit<Entry, 'id'>) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;

  setBudget: (categoryId: string, year: number, month: number, amount: number) => Promise<void>;

  addCardEntry: (entry: Omit<CardEntry, 'id'>) => Promise<void>;
  updateCardEntry: (id: string, patch: Omit<CardEntry, 'id'>) => Promise<void>;
  removeCardEntry: (id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  entries: [],
  budgets: [],
  cardEntries: [],
  loading: false,

  loadAll: async () => {
    if (!supabase) return;
    set({ loading: true });
    const [entriesRes, budgetsRes, cardRes] = await Promise.all([
      supabase.from('entries').select('*'),
      supabase.from('budgets').select('*'),
      supabase.from('card_entries').select('*'),
    ]);
    if (entriesRes.error) console.error(entriesRes.error);
    if (budgetsRes.error) console.error(budgetsRes.error);
    if (cardRes.error) console.error(cardRes.error);
    set({
      entries: ((entriesRes.data as EntryRow[]) ?? []).map(fromEntryRow),
      budgets: ((budgetsRes.data as BudgetRow[]) ?? []).map(fromBudgetRow),
      cardEntries: ((cardRes.data as CardEntryRow[]) ?? []).map(fromCardEntryRow),
      loading: false,
    });
  },

  reset: () => set({ entries: [], budgets: [], cardEntries: [] }),

  addEntry: async (entry) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('entries')
      .insert({
        category_id: entry.categoryId,
        year: entry.year,
        month: entry.month,
        label: entry.label,
        amount: entry.amount,
        memo: entry.memo ?? null,
      })
      .select()
      .single();
    if (error || !data) return console.error(error);
    set((state) => ({ entries: [...state.entries, fromEntryRow(data as EntryRow)] }));
  },

  updateEntry: async (id, patch) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('entries')
      .update({
        category_id: patch.categoryId,
        year: patch.year,
        month: patch.month,
        label: patch.label,
        amount: patch.amount,
        memo: patch.memo ?? null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return console.error(error);
    const updated = fromEntryRow(data as EntryRow);
    set((state) => ({ entries: state.entries.map((e) => (e.id === id ? updated : e)) }));
  },

  removeEntry: async (id) => {
    if (!supabase) return;
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) return console.error(error);
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
  },

  setBudget: async (categoryId, year, month, amount) => {
    if (!supabase) return;
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) return;
    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        { user_id: userId, category_id: categoryId, year, month, amount },
        { onConflict: 'user_id,category_id,year,month' },
      )
      .select()
      .single();
    if (error || !data) return console.error(error);
    const updated = fromBudgetRow(data as BudgetRow);
    set((state) => {
      const idx = state.budgets.findIndex(
        (b) => b.categoryId === categoryId && b.year === year && b.month === month,
      );
      if (idx >= 0) {
        const next = [...state.budgets];
        next[idx] = updated;
        return { budgets: next };
      }
      return { budgets: [...state.budgets, updated] };
    });
  },

  addCardEntry: async (entry) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('card_entries')
      .insert({
        year: entry.year,
        month: entry.month,
        label: entry.label,
        amount: entry.amount,
        memo: entry.memo ?? null,
      })
      .select()
      .single();
    if (error || !data) return console.error(error);
    set((state) => ({ cardEntries: [...state.cardEntries, fromCardEntryRow(data as CardEntryRow)] }));
  },

  updateCardEntry: async (id, patch) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('card_entries')
      .update({
        year: patch.year,
        month: patch.month,
        label: patch.label,
        amount: patch.amount,
        memo: patch.memo ?? null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return console.error(error);
    const updated = fromCardEntryRow(data as CardEntryRow);
    set((state) => ({ cardEntries: state.cardEntries.map((e) => (e.id === id ? updated : e)) }));
  },

  removeCardEntry: async (id) => {
    if (!supabase) return;
    const { error } = await supabase.from('card_entries').delete().eq('id', id);
    if (error) return console.error(error);
    set((state) => ({ cardEntries: state.cardEntries.filter((e) => e.id !== id) }));
  },
}));

// Load data whenever a user session becomes available; clear it on sign-out.
useAuthStore.subscribe((state, prevState) => {
  if (state.session && state.session.user.id !== prevState.session?.user.id) {
    useBudgetStore.getState().loadAll();
  } else if (!state.session && prevState.session) {
    useBudgetStore.getState().reset();
  }
});
