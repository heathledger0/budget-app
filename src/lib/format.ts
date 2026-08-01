export function formatWon(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}₩${Math.abs(rounded).toLocaleString('ko-KR')}`;
}

export function amountColorClass(amount: number): string {
  return amount < 0 ? 'text-red-600' : '';
}

export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '-';
  return `${Math.round(ratio * 100)}%`;
}
