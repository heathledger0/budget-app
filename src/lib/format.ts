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
