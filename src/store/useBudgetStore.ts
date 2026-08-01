import { create } from 'zustand';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
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
