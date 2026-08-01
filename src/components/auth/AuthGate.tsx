import type { ReactNode } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import AuthPage from './AuthPage';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { session, initializing } = useAuthStore();

  if (isSupabaseConfigured && initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        불러오는 중...
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return <>{children}</>;
}
