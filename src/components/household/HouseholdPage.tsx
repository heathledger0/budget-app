import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useHouseholdStore } from '../../store/useHouseholdStore';
import { useBudgetStore } from '../../store/useBudgetStore';

export default function HouseholdPage() {
  const myUserId = useAuthStore((s) => s.session?.user.id);
  const { householdName, members, inviteCode, inviteExpiresAt, loading, error, createInvite, cancelInvite, joinByCode, leave } =
    useHouseholdStore();
  const loadAllBudget = useBudgetStore((s) => s.loadAll);

  const [joinCode, setJoinCode] = useState('');
  const [joinMessage, setJoinMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCreateInvite() {
    await createInvite();
  }

  async function handleCopy() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — user can still select and copy the code manually
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    const confirmed = window.confirm(
      '참여하면 지금까지 내가 입력한 가계부 내역이 상대방의 가계부와 합쳐집니다. 계속할까요?',
    );
    if (!confirmed) return;
    setJoining(true);
    setJoinMessage(null);
    const result = await joinByCode(joinCode);
    setJoining(false);
    if (result.ok) {
      setJoinCode('');
      setJoinMessage({ type: 'ok', text: '참여했습니다! 두 사람의 가계부가 하나로 합쳐졌습니다.' });
      await loadAllBudget();
    } else {
      setJoinMessage({ type: 'error', text: result.message ?? '참여에 실패했습니다.' });
    }
  }

  async function handleLeave() {
    const confirmed = window.confirm(
      '가구 공유를 그만두면 내가 입력한 내역만 가지고 새로운 개인 가계부로 분리됩니다. 계속할까요?',
    );
    if (!confirmed) return;
    setLeaving(true);
    const result = await leave();
    setLeaving(false);
    if (result.ok) {
      await loadAllBudget();
    } else {
      setJoinMessage({ type: 'error', text: result.message ?? '나가기에 실패했습니다.' });
    }
  }

  const isShared = members.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">🏠 가구 공유</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          배우자나 가족과 초대 코드를 주고받으면 같은 가계부를 함께 기록할 수 있어요.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h2 className="mb-3 text-base font-bold text-gray-900 dark:text-gray-100">
          {householdName ?? '나의 가계부'}
        </h2>
        {loading ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">불러오는 중...</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {members.map((m) => (
              <li
                key={m.userId}
                className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <span className="text-gray-700 dark:text-gray-300">{m.email ?? m.userId}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {m.userId === myUserId ? '나' : '구성원'} · {new Date(m.joinedAt).toLocaleDateString('ko-KR')}
                </span>
              </li>
            ))}
          </ul>
        )}
        {isShared && (
          <button
            type="button"
            onClick={handleLeave}
            disabled={leaving}
            className="mt-3 rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
          >
            {leaving ? '나가는 중...' : '가구 나가기'}
          </button>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h2 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-100">📨 초대하기</h2>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          코드를 만들어 카카오톡이나 문자로 전달하면, 상대방이 아래에서 코드를 입력해 참여할 수 있어요.
        </p>
        {inviteCode ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-blue-50 px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {inviteCode}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {copied ? '복사됨!' : '복사'}
            </button>
            <button
              type="button"
              onClick={cancelInvite}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-700"
            >
              취소
            </button>
            {inviteExpiresAt && (
              <span className="w-full text-xs text-gray-400 dark:text-gray-500">
                {new Date(inviteExpiresAt).toLocaleDateString('ko-KR')}까지 유효
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCreateInvite}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            초대 코드 만들기
          </button>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h2 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-100">🔑 코드로 참여하기</h2>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          상대방에게 받은 초대 코드를 입력하세요.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-0 flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm font-mono uppercase tracking-widest"
            placeholder="예: AB12CD34"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            maxLength={8}
          />
          <button
            type="button"
            onClick={handleJoin}
            disabled={joining || !joinCode.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {joining ? '참여 중...' : '참여하기'}
          </button>
        </div>
        {joinMessage && (
          <p
            className={`mt-2 text-sm ${
              joinMessage.type === 'ok'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {joinMessage.text}
          </p>
        )}
      </div>
    </div>
  );
}
