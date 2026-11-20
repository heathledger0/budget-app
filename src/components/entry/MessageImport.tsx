import { useRef, useState } from 'react';
import type { Entry } from '../../types';
import { SECTION_ORDER, categoryById } from '../../constants/categories';
import { useSelectionStore } from '../../store/useSelectionStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import { daysInMonth } from '../../lib/calculations';
import { describeError } from '../../lib/format';
import { parseMessages, type ParsedReceipt } from '../../lib/messageParser';
import { recognizeReceipts } from '../../lib/receiptOcr';
import CategorySelect from '../card/CategorySelect';

interface Draft {
  label: string;
  amount: string;
  month: string;
  day: string;
  categoryId: string;
  direction: 'in' | 'out';
}

type NewEntry = Omit<Entry, 'id' | 'seriesId'>;

function toEntry(draft: Draft, year: number): NewEntry | string {
  const amount = Number(draft.amount.replace(/,/g, ''));
  if (!draft.amount || !Number.isFinite(amount) || amount <= 0) return '금액을 확인해주세요.';
  if (!draft.categoryId) return '카테고리를 골라주세요.';
  const month = Math.round(Number(draft.month));
  if (!(month >= 1 && month <= 12)) return '월을 확인해주세요.';
  const day = Math.min(daysInMonth(year, month), Math.max(1, Math.round(Number(draft.day)) || 1));
  return {
    categoryId: draft.categoryId,
    year,
    month,
    day,
    label: draft.label.trim() || categoryById(draft.categoryId)?.name || '',
    amount,
  };
}

const inputClass =
  'rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm';

export default function MessageImport() {
  const { year, month, day } = useSelectionStore();
  const importEntries = useBudgetStore((s) => s.importEntries);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load(items: ParsedReceipt[]) {
    setDrafts(
      items.map((item) => ({
        label: item.label ?? '',
        amount: item.amount ? String(item.amount) : '',
        month: String(item.month ?? month),
        day: String(item.day ?? day),
        categoryId: item.categoryId ?? '',
        direction: item.direction,
      })),
    );
    setError(
      items.every((item) => !item.amount)
        ? '금액을 찾지 못했어요. 직접 입력하거나 수정해주세요.'
        : null,
    );
  }

  async function handleScreenshot(file: File) {
    setOcrBusy(true);
    setError(null);
    try {
      const { items } = await recognizeReceipts(file);
      load(items);
    } catch (err) {
      setError(`인식 실패: ${describeError(err)}`);
    } finally {
      setOcrBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handlePaste() {
    if (!pasteText.trim()) return;
    load(parseMessages(pasteText));
    setPasteText('');
    setPasteOpen(false);
  }

  function updateDraft(index: number, patch: Partial<Draft>) {
    setDrafts((items) => items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  // Saves the drafts at `indices`; the ones that saved are removed from the list,
  // anything invalid or failed stays for the user to fix.
  async function save(indices: number[]) {
    if (savingRef.current) return;
    const valid: { index: number; entry: NewEntry }[] = [];
    let firstProblem: string | null = null;
    for (const index of indices) {
      const result = toEntry(drafts[index], year);
      if (typeof result === 'string') firstProblem ??= result;
      else valid.push({ index, entry: result });
    }
    if (valid.length === 0) {
      setError(firstProblem);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const inserted = await importEntries(valid.map((v) => v.entry));
      if (inserted !== valid.length) {
        setError('저장에 실패했어요. 잠시 후 다시 시도해주세요.');
        return;
      }
      const saved = new Set(valid.map((v) => v.index));
      setDrafts((items) => items.filter((_, i) => !saved.has(i)));
      if (firstProblem) setError(`일부 항목은 추가하지 않았어요: ${firstProblem}`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleScreenshot(file);
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          📩 은행 입출금·체크카드 문자를 캡처해서 올리거나 문자 내용을 복사해 붙여넣으면 금액·날짜·
          사용처를 읽어 항목으로 만들어드려요. 신용카드 문자는 신용카드 메뉴에서 올려주세요(같은
          지출이 두 번 잡히지 않도록).
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={ocrBusy}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ocrBusy ? '인식 중...' : '스크린샷'}
          </button>
          <button
            type="button"
            onClick={() => setPasteOpen((open) => !open)}
            className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900"
          >
            문자 붙여넣기
          </button>
        </div>
      </div>

      {pasteOpen && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            className={`${inputClass} min-h-28`}
            placeholder="문자 내용을 붙여넣으세요. 여러 건을 한 번에 붙여넣어도 돼요."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <button
            type="button"
            onClick={handlePaste}
            className="self-end rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            읽기
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded bg-red-50 px-2 py-1.5 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {drafts.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {drafts.length}건을 찾았어요. 확인 후 추가해주세요 ({year}년 기준).
            </p>
            <button
              type="button"
              onClick={() => save(drafts.map((_, i) => i))}
              disabled={saving}
              className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              모두 추가
            </button>
          </div>
          {drafts.map((draft, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              {draft.direction === 'in' && (
                <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                  입금
                </span>
              )}
              <input
                className={`${inputClass} min-w-40 flex-1`}
                placeholder="항목명"
                value={draft.label}
                onChange={(e) => updateDraft(i, { label: e.target.value })}
              />
              <input
                className={`${inputClass} w-28 text-right`}
                placeholder="금액"
                inputMode="numeric"
                value={draft.amount}
                onChange={(e) => updateDraft(i, { amount: e.target.value })}
              />
              <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <input
                  className={`${inputClass} w-12 text-right`}
                  aria-label="월"
                  inputMode="numeric"
                  value={draft.month}
                  onChange={(e) => updateDraft(i, { month: e.target.value })}
                />
                월
                <input
                  className={`${inputClass} w-12 text-right`}
                  aria-label="일"
                  inputMode="numeric"
                  value={draft.day}
                  onChange={(e) => updateDraft(i, { day: e.target.value })}
                />
                일
              </span>
              <CategorySelect
                value={draft.categoryId}
                onChange={(categoryId) => updateDraft(i, { categoryId })}
                sections={SECTION_ORDER}
                emptyLabel="카테고리 선택"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => save([i])}
                disabled={saving}
                className="shrink-0 rounded bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-60 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
              >
                추가
              </button>
              <button
                type="button"
                onClick={() => setDrafts((items) => items.filter((_, j) => j !== i))}
                className="shrink-0 rounded px-2 py-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950 dark:hover:text-red-400"
                aria-label="무시"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
