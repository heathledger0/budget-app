export function formatWon(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}₩${Math.abs(rounded).toLocaleString('ko-KR')}`;
}

export function amountColorClass(amount: number): string {
  return amount < 0 ? 'text-red-600 dark:text-red-400' : '';
}

export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '-';
  return `${Math.round(ratio * 100)}%`;
}

// Percent change from `previous` to `current`, e.g. "+12%" / "-5%" / "신규" / "변화 없음".
export function formatChange(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? '변화 없음' : '신규';
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

// Best-effort human-readable message for a caught error, including Supabase/Postgrest
// error-like objects that aren't real Error instances (so `instanceof Error` misses them
// and String(err) would otherwise just print "[object Object]").
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message) {
      const hint = typeof obj.hint === 'string' && obj.hint ? ` (${obj.hint})` : '';
      return `${obj.message}${hint}`;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}
