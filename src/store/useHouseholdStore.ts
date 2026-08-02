import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from './useAuthStore';

export interface HouseholdMember {
  userId: string;
  email: string | null;
  joinedAt: string;
}

interface HouseholdMemberRow {
  user_id: string;
  household_id: string;
  email: string | null;
  joined_at: string;
}

interface HouseholdState {
  householdId: string | null;
  householdName: string | null;
  members: HouseholdMember[];
  inviteCode: string | null;
  inviteExpiresAt: string | null;
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  reset: () => void;
  createInvite: () => Promise<void>;
  cancelInvite: () => Promise<void>;
  joinByCode: (code: string) => Promise<{ ok: boolean; message?: string }>;
  leave: () => Promise<{ ok: boolean; message?: string }>;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0/O, 1/I 등 헷갈리는 글자는 제외
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const useHouseholdStore = create<HouseholdState>((set, get) => ({
  householdId: null,
  householdName: null,
  members: [],
  inviteCode: null,
  inviteExpiresAt: null,
  loading: false,
  error: null,

  load: async () => {
    if (!supabase) return;
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('household_members')
      .select('*')
      .order('joined_at');
    if (error || !data || data.length === 0) {
      set({ loading: false, error: error?.message ?? null });
      return;
    }
    const rows = data as HouseholdMemberRow[];
    const householdId = rows[0].household_id;
    const members = rows.map((r) => ({
      userId: r.user_id,
      email: r.email,
      joinedAt: r.joined_at,
    }));

    const [{ data: hh }, { data: invites }] = await Promise.all([
      supabase.from('households').select('name').eq('id', householdId).maybeSingle(),
      supabase
        .from('household_invites')
        .select('code, expires_at')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);
    const invite = invites?.[0] as { code: string; expires_at: string } | undefined;

    set({
      householdId,
      householdName: (hh as { name: string } | null)?.name ?? '나의 가계부',
      members,
      inviteCode: invite?.code ?? null,
      inviteExpiresAt: invite?.expires_at ?? null,
      loading: false,
    });
  },

  reset: () =>
    set({
      householdId: null,
      householdName: null,
      members: [],
      inviteCode: null,
      inviteExpiresAt: null,
      error: null,
    }),

  createInvite: async () => {
    if (!supabase) return;
    const householdId = get().householdId;
    const userId = useAuthStore.getState().session?.user.id;
    if (!householdId || !userId) return;
    const code = generateInviteCode();
    const { data, error } = await supabase
      .from('household_invites')
      .insert({ household_id: householdId, code, created_by: userId })
      .select('code, expires_at')
      .single();
    if (error || !data) {
      set({ error: error?.message ?? '초대 코드 생성에 실패했습니다' });
      return;
    }
    set({ inviteCode: data.code, inviteExpiresAt: data.expires_at, error: null });
  },

  cancelInvite: async () => {
    if (!supabase) return;
    const { inviteCode } = get();
    if (!inviteCode) return;
    await supabase.from('household_invites').delete().eq('code', inviteCode);
    set({ inviteCode: null, inviteExpiresAt: null });
  },

  joinByCode: async (code) => {
    if (!supabase) return { ok: false, message: '연결할 수 없습니다' };
    const { error } = await supabase.rpc('join_household', {
      invite_code: code.trim().toUpperCase(),
    });
    if (error) return { ok: false, message: error.message };
    await get().load();
    return { ok: true };
  },

  leave: async () => {
    if (!supabase) return { ok: false, message: '연결할 수 없습니다' };
    const { error } = await supabase.rpc('leave_household');
    if (error) return { ok: false, message: error.message };
    await get().load();
    return { ok: true };
  },
}));

let channel: RealtimeChannel | null = null;

function subscribeRealtime() {
  if (!supabase || channel) return;
  channel = supabase
    .channel('household-app')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members' }, () => {
      useHouseholdStore.getState().load();
    })
    .subscribe();
}

function unsubscribeRealtime() {
  if (channel) {
    supabase?.removeChannel(channel);
    channel = null;
  }
}

useAuthStore.subscribe((state, prevState) => {
  if (state.session && state.session.user.id !== prevState.session?.user.id) {
    useHouseholdStore.getState().load();
    subscribeRealtime();
  } else if (!state.session && prevState.session) {
    useHouseholdStore.getState().reset();
    unsubscribeRealtime();
  }
});
