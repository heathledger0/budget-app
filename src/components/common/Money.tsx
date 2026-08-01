import { amountColorClass, formatWon } from '../../lib/format';

export default function Money({ amount, className = '' }: { amount: number; className?: string }) {
  return <span className={`${amountColorClass(amount)} ${className}`}>{formatWon(amount)}</span>;
}
