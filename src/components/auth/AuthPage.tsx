import { useState, type FormEvent } from 'react';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';

export default function AuthPage() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          <h1 className="mb-2 text-lg font-bold text-gray-900">Supabase 설정이 필요합니다</h1>
          <p>
            로그인 기능을 쓰려면 <code className="rounded bg-gray-100 px-1">.env</code>에{' '}
            <code className="rounded bg-gray-100 px-1">VITE_SUPABASE_URL</code>과{' '}
            <code className="rounded bg-gray-100 px-1">VITE_SUPABASE_ANON_KEY</code>를 설정해야 합니다.
            자세한 방법은 README를 참고하세요.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo('가입 확인 이메일을 보냈습니다. 메일함을 확인해 인증을 완료해주세요.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6"
      >
        <h1 className="mb-1 text-lg font-bold text-gray-900">가계부 관리</h1>
        <p className="mb-4 text-sm text-gray-500">
          {mode === 'signIn' ? '로그인하고 내 가계부를 확인하세요.' : '이메일로 새 계정을 만드세요.'}
        </p>

        <label className="mb-1 block text-xs font-medium text-gray-600">이메일</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="you@example.com"
        />

        <label className="mb-1 block text-xs font-medium text-gray-600">비밀번호</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="6자 이상"
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {info && <p className="mb-3 text-sm text-emerald-600">{info}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {mode === 'signIn' ? '로그인' : '회원가입'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            setError(null);
            setInfo(null);
          }}
          className="mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-700"
        >
          {mode === 'signIn' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </form>
    </div>
  );
}
