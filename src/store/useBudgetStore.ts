import { create } from 'zustand';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from './useAuthStore';
import { useHouseholdStore } from './useHouseholdStore';
import type { Budget, CardEntry, Entry, SavingsGoal } from '../types';

interface EntryRow {
  id: string;
  category_id: string;
  year: number;
  month: number;
  day: number;
  label: string;
  amount: number;
  memo: string | null;
  series_id: string | null;
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
interface SavingsGoalRow {
  id: string;
  category_id: string;
  name: string;
  target_amount: number;
  start_year: number;
  start_month: number;
  target_date: string | null;
}

const fromEntryRow = (row: EntryRow): Entry => ({
  id: row.id,
  categoryId: row.category_id,
  year: row.year,
  month: row.month,
  day: row.day,
  label: row.label,
  amount: Number(row.amount),
  memo: row.memo ?? undefined,
  seriesId: row.series_id ?? undefined,
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

const fromSavingsGoalRow = (row: SavingsGoalRow): SavingsGoal => ({
  id: row.id,
  categoryId: row.category_id,
  name: row.name,
  targetAmount: Number(row.target_amount),
  startYear: row.start_year,
  startMonth: row.start_month,
  targetDate: row.target_date ?? undefined,
});

interface BudgetState {
  entries: Entry[];
  budgets: Budget[];
  cardEntries: CardEntry[];
  savingsGoals: SavingsGoal[];
  loading: boolean;

  loadAll: () => Promise<void>;
  reset: () => void;

  addEntry: (entry: Omit<Entry, 'id' | 'seriesId'>) => Promise<void>;
  importEntries: (entries: Omit<Entry, 'id' | 'seriesId'>[]) => Promise<number>;
  addFixedSeriesEntry: (entry: Omit<Entry, 'id' | 'seriesId'>) => Promise<void>;
  updateEntry: (id: string, patch: Omit<Entry, 'id' | 'seriesId'>) => Promise<void>;
  updateEntrySeriesForward: (
    entry: Entry,
    patch: { label: string; amount: number; memo?: string },
  ) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;

  setBudget: (categoryId: string, year: number, month: number, amount: number) => Promise<void>;

  addCardEntry: (entry: Omit<CardEntry, 'id'>) => Promise<void>;
  updateCardEntry: (id: string, patch: Omit<CardEntry, 'id'>) => Promise<void>;
  removeCardEntry: (id: string) => Promise<void>;

  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => Promise<void>;
  removeSavingsGoal: (id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  entries: [],
  budgets: [],
  cardEntries: [],
  savingsGoals: [],
  loading: false,

  loadAll: async () => {
    if (!supabase) return;
    set({ loading: true });
    const [entriesRes, budgetsRes, cardRes, goalsRes] = await Promise.all([
      supabase.from('entries').select('*'),
      supabase.from('budgets').select('*'),
      supabase.from('card_entries').select('*'),
      supabase.from('savings_goals').select('*'),
    ]);
    if (entriesRes.error) console.error(entriesRes.error);
    if (budgetsRes.error) console.error(budgetsRes.error);
    if (cardRes.error) console.error(cardRes.error);
    if (goalsRes.error) console.error(goalsRes.error);
    set({
      entries: ((entriesRes.data as EntryRow[]) ?? []).map(fromEntryRow),
      budgets: ((budgetsRes.data as BudgetRow[]) ?? []).map(fromBudgetRow),
      cardEntries: ((cardRes.data as CardEntryRow[]) ?? []).map(fromCardEntryRow),
      savingsGoals: ((goalsRes.data as SavingsGoalRow[]) ?? []).map(fromSavingsGoalRow),
      loading: false,
    });
  },

  reset: () => set({ entries: [], budgets: [], cardEntries: [], savingsGoals: [] }),

  addEntry: async (entry) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('entries')
      .insert({
        category_id: entry.categoryId,
        year: entry.year,
        month: entry.month,
        day: entry.day,
        label: entry.label,
        amount: entry.amount,
        memo: entry.memo ?? null,
      })
      .select()
      .single();
    if (error || !data) return console.error(error);
    set((state) => ({ entries: [...state.entries, fromEntryRow(data as EntryRow)] }));
  },

  importEntries: async (entries) => {
    if (!supabase || entries.length === 0) return 0;
    const CHUNK_SIZE = 500;
    const inserted: EntryRow[] = [];
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE).map((entry) => ({
        category_id: entry.categoryId,
        year: entry.year,
        month: entry.month,
        day: entry.day,
        label: entry.label,
        amount: entry.amount,
        memo: entry.memo ?? null,
      }));
      const { data, error } = await supabase.from('entries').insert(chunk).select();
      if (error) {
        console.error(error);
        continue;
      }
      inserted.push(...((data as EntryRow[]) ?? []));
    }
    const newEntries = inserted.map(fromEntryRow);
    set((state) => ({ entries: [...state.entries, ...newEntries] }));
    return newEntries.length;
  },

  addFixedSeriesEntry: async (entry) => {
    if (!supabase) return;
    const seriesId = crypto.randomUUID();
    const months = [];
    for (let m = entry.month; m <= 12; m++) months.push(m);
    const rows = months.map((m) => ({
      category_id: entry.categoryId,
      year: entry.year,
      month: m,
      day: entry.day,
      label: entry.label,
      amount: entry.amount,
      memo: entry.memo ?? null,
      series_id: seriesId,
    }));
    const { data, error } = await supabase.from('entries').insert(rows).select();
    if (error || !data) return console.error(error);
    const newEntries = (data as EntryRow[]).map(fromEntryRow);
    set((state) => ({ entries: [...state.entries, ...newEntries] }));
  },

  updateEntry: async (id, patch) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('entries')
      .update({
        category_id: patch.categoryId,
        year: patch.year,
        month: patch.month,
        day: patch.day,
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

  updateEntrySeriesForward: async (entry, patch) => {
    if (!supabase) return;
    if (entry.seriesId) {
      const { data, error } = await supabase
        .from('entries')
        .update({ label: patch.label, amount: patch.amount, memo: patch.memo ?? null })
        .eq('series_id', entry.seriesId)
        .eq('year', entry.year)
        .gte('month', entry.month)
        .select();
      if (error || !data) return console.error(error);
      const updatedRows = (data as EntryRow[]).map(fromEntryRow);
      set((state) => ({
        entries: state.entries.map((e) => updatedRows.find((u) => u.id === e.id) ?? e),
      }));
      return;
    }

    // Legacy entry with no series yet: turn it into the start of a new one.
    const seriesId = crypto.randomUUID();
    const { data: updatedRow, error: updateError } = await supabase
      .from('entries')
      .update({ label: patch.label, amount: patch.amount, memo: patch.memo ?? null, series_id: seriesId })
      .eq('id', entry.id)
      .select()
      .single();
    if (updateError || !updatedRow) return console.error(updateError);

    const months = [];
    for (let m = entry.month + 1; m <= 12; m++) months.push(m);
    let insertedRows: EntryRow[] = [];
    if (months.length > 0) {
      const rows = months.map((m) => ({
        category_id: entry.categoryId,
        year: entry.year,
        month: m,
        day: entry.day,
        label: patch.label,
        amount: patch.amount,
        memo: patch.memo ?? null,
        series_id: seriesId,
      }));
      const { data: inserted, error: insertError } = await supabase.from('entries').insert(rows).select();
      if (insertError) console.error(insertError);
      insertedRows = (inserted as EntryRow[]) ?? [];
    }
    const updated = fromEntryRow(updatedRow as EntryRow);
    const newEntries = insertedRows.map(fromEntryRow);
    set((state) => ({
      entries: [...state.entries.map((e) => (e.id === entry.id ? updated : e)), ...newEntries],
    }));
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
    const householdId = useHouseholdStore.getState().householdId;
    if (!userId || !householdId) return;
    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        { user_id: userId, household_id: householdId, category_id: categoryId, year, month, amount },
        { onConflict: 'household_id,category_id,year,month' },
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

  addSavingsGoal: async (goal) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        category_id: goal.categoryId,
        name: goal.name,
        target_amount: goal.targetAmount,
        start_year: goal.startYear,
        start_month: goal.startMonth,
        target_date: goal.targetDate ?? null,
      })
      .select()
      .single();
    if (error || !data) return console.error(error);
    set((state) => ({
      savingsGoals: [...state.savingsGoals, fromSavingsGoalRow(data as SavingsGoalRow)],
    }));
  },

  removeSavingsGoal: async (id) => {
    if (!supabase) return;
    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    if (error) return console.error(error);
    set((state) => ({ savingsGoals: state.savingsGoals.filter((g) => g.id !== id) }));
  },
}));

let channel: RealtimeChannel | null = null;

function applyEntryChange(payload: RealtimePostgresChangesPayload<EntryRow>) {
  const { entries } = useBudgetStore.getState();
  if (payload.eventType === 'INSERT') {
    const row = payload.new as EntryRow;
    if (entries.some((e) => e.id === row.id)) return;
    useBudgetStore.setState({ entries: [...entries, fromEntryRow(row)] });
  } else if (payload.eventType === 'UPDATE') {
    const row = payload.new as EntryRow;
    useBudgetStore.setState({
      entries: entries.map((e) => (e.id === row.id ? fromEntryRow(row) : e)),
    });
  } else if (payload.eventType === 'DELETE') {
    const oldRow = payload.old as { id: string };
    useBudgetStore.setState({ entries: entries.filter((e) => e.id !== oldRow.id) });
  }
}

function applyBudgetChange(payload: RealtimePostgresChangesPayload<BudgetRow>) {
  const { budgets } = useBudgetStore.getState();
  if (payload.eventType === 'INSERT') {
    const row = payload.new as BudgetRow;
    if (budgets.some((b) => b.id === row.id)) return;
    useBudgetStore.setState({ budgets: [...budgets, fromBudgetRow(row)] });
  } else if (payload.eventType === 'UPDATE') {
    const row = payload.new as BudgetRow;
    useBudgetStore.setState({
      budgets: budgets.map((b) => (b.id === row.id ? fromBudgetRow(row) : b)),
    });
  } else if (payload.eventType === 'DELETE') {
    const oldRow = payload.old as { id: string };
    useBudgetStore.setState({ budgets: budgets.filter((b) => b.id !== oldRow.id) });
  }
}

function applyCardEntryChange(payload: RealtimePostgresChangesPayload<CardEntryRow>) {
  const { cardEntries } = useBudgetStore.getState();
  if (payload.eventType === 'INSERT') {
    const row = payload.new as CardEntryRow;
    if (cardEntries.some((e) => e.id === row.id)) return;
    useBudgetStore.setState({ cardEntries: [...cardEntries, fromCardEntryRow(row)] });
  } else if (payload.eventType === 'UPDATE') {
    const row = payload.new as CardEntryRow;
    useBudgetStore.setState({
      cardEntries: cardEntries.map((e) => (e.id === row.id ? fromCardEntryRow(row) : e)),
    });
  } else if (payload.eventType === 'DELETE') {
    const oldRow = payload.old as { id: string };
    useBudgetStore.setState({ cardEntries: cardEntries.filter((e) => e.id !== oldRow.id) });
  }
}

function applySavingsGoalChange(payload: RealtimePostgresChangesPayload<SavingsGoalRow>) {
  const { savingsGoals } = useBudgetStore.getState();
  if (payload.eventType === 'INSERT') {
    const row = payload.new as SavingsGoalRow;
    if (savingsGoals.some((g) => g.id === row.id)) return;
    useBudgetStore.setState({ savingsGoals: [...savingsGoals, fromSavingsGoalRow(row)] });
  } else if (payload.eventType === 'UPDATE') {
    const row = payload.new as SavingsGoalRow;
    useBudgetStore.setState({
      savingsGoals: savingsGoals.map((g) => (g.id === row.id ? fromSavingsGoalRow(row) : g)),
    });
  } else if (payload.eventType === 'DELETE') {
    const oldRow = payload.old as { id: string };
    useBudgetStore.setState({ savingsGoals: savingsGoals.filter((g) => g.id !== oldRow.id) });
  }
}

function subscribeRealtime(userId: string) {
  if (!supabase || channel) return;
  channel = supabase
    .channel(`budget-app:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, applyEntryChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, applyBudgetChange)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'card_entries' },
      applyCardEntryChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'savings_goals' },
      applySavingsGoalChange,
    )
    .subscribe();
}

function unsubscribeRealtime() {
  if (channel) {
    supabase?.removeChannel(channel);
    channel = null;
  }
}

// Load data + start live sync whenever a user session becomes available; tear down on sign-out.
useAuthStore.subscribe((state, prevState) => {
  if (state.session && state.session.user.id !== prevState.session?.user.id) {
    useBudgetStore.getState().loadAll();
    subscribeRealtime(state.session.user.id);
  } else if (!state.session && prevState.session) {
    useBudgetStore.getState().reset();
    unsubscribeRealtime();
  }
});
