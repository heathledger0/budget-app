import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthState {
  session: Session | null;
  initializing: boolean;
}

export const useAuthStore = create<AuthState>((set) => {
  if (supabase) {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, initializing: false });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, initializing: false });
    });
  }

  return {
    session: null,
    initializing: Boolean(supabase),
  };
});
