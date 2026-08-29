import { useRef, useState } from 'react';
import { useBudgetStore } from '../../store/useBudgetStore';
import { categoriesByName, categoryByNameAndSection, sectionByLabel } from '../../constants/categories';
import { parseCsv } from '../../lib/csvExport';
import type { Entry } from '../../types';

type ParsedEntry = Omit<Entry, 'id' | 'seriesId'>;

interface RowError {
  row: number; // 1-based line number in the file, including header
  reason: string;
}

interface ParseResult {
  fileName: string;
  valid: ParsedEntry[];
  errors: RowError[];
}

const REQUIRED_HEADERS = ['연도', '월', '카테고리', '항목명', '금액'];

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s원]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseEntriesCsv(text: string): ParseResult {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { fileName: '', valid: [], errors: [{ row: 1, reason: '빈 파일입니다.' }] };
  }

  const header = rows[0].map((h) => h.trim());
  const colIndex: Record<string, number> = {};
  header.forEach((h, i) => {
    colIndex[h] = i;
  });

  const missing = REQUIRED_HEADERS.filter((h) => !(h in colIndex));
  if (missing.length > 0) {
    return {
      fileName: '',
      valid: [],
      errors: [{ row: 1, reason: `필수 열이 없습니다: ${missing.join(', ')}` }],
    };
  }

  const valid: ParsedEntry[] = [];
  const errors: RowError[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const lineNo = i + 1;
    const get = (name: string) => (colIndex[name] !== undefined ? (cells[colIndex[name]] ?? '').trim() : '');

    const yearRaw = get('연도');
    const monthRaw = get('월');
    const dayRaw = get('일');
    const sectionLabel = get('섹션');
    const categoryName = get('카테고리');
    const label = get('항목명');
    const amountRaw = get('금액');
    const memo = get('메모');

    if (!yearRaw && !monthRaw && !categoryName && !label && !amountRaw) continue; // skip blank line

    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = dayRaw ? Number(dayRaw) : 1;

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      errors.push({ row: lineNo, reason: `연도 값이 올바르지 않습니다: "${yearRaw}"` });
      continue;
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      errors.push({ row: lineNo, reason: `월 값이 올바르지 않습니다: "${monthRaw}"` });
      continue;
    }
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      errors.push({ row: lineNo, reason: `일 값이 올바르지 않습니다: "${dayRaw}"` });
      continue;
    }
    if (!label) {
      errors.push({ row: lineNo, reason: '항목명이 비어 있습니다.' });
      continue;
    }
    const amount = parseAmount(amountRaw);
    if (amount === null || amount <= 0) {
      errors.push({ row: lineNo, reason: `금액 값이 올바르지 않습니다: "${amountRaw}"` });
      continue;
    }
    if (!categoryName) {
      errors.push({ row: lineNo, reason: '카테고리가 비어 있습니다.' });
      continue;
    }

    const matches = categoriesByName(categoryName);
    let category = matches[0];
    if (matches.length > 1) {
      const section = sectionLabel ? sectionByLabel(sectionLabel) : undefined;
      if (!section) {
        errors.push({
          row: lineNo,
          reason: `"${categoryName}" 카테고리가 여러 섹션에 있어 섹션 열이 필요합니다.`,
        });
        continue;
      }
      const bySection = categoryByNameAndSection(categoryName, section);
      if (!bySection) {
        errors.push({ row: lineNo, reason: `"${sectionLabel}" 섹션에 "${categoryName}" 카테고리가 없습니다.` });
        continue;
      }
      category = bySection;
    }
    if (!category) {
      errors.push({ row: lineNo, reason: `알 수 없는 카테고리입니다: "${categoryName}"` });
      continue;
    }

    valid.push({
      categoryId: category.id,
      year,
      month,
      day,
      label,
      amount,
      memo: memo || undefined,
    });
  }

  return { fileName: '', valid, errors };
}

export default function ImportSection() {
  const importEntries = useBudgetStore((s) => s.importEntries);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    const parsed = parseEntriesCsv(text);
    setResult({ ...parsed, fileName: file.name });
    setImportedCount(null);
  }

  async function runImport() {
    if (!result || result.valid.length === 0) return;
    setImporting(true);
    const count = await importEntries(result.valid);
    setImporting(false);
    setImportedCount(count);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function cancel() {
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <h2 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-100">📥 데이터 가져오기</h2>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        엑셀에서 저장한 CSV 파일을 가계부 내역으로 가져옵니다. 헤더에{' '}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">연도, 월, 카테고리, 항목명, 금액</code>
        열이 있어야 하며, <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">일, 섹션, 메모</code>는
        선택 사항입니다. "가계부 전체 내역" 내보내기 파일 형식과 동일합니다.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
        >
          CSV 파일 선택
        </button>
        {importedCount !== null && (
          <span className="text-sm text-green-600 dark:text-green-400">
            {importedCount}건을 가져왔습니다.
          </span>
        )}
      </div>

      {result && (
        <div className="mt-3 rounded-md border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            <span className="font-medium">{result.fileName}</span> — 가져올 수 있는 항목{' '}
            <span className="font-semibold text-blue-600 dark:text-blue-400">{result.valid.length}건</span>
            {result.errors.length > 0 && (
              <>
                , 오류{' '}
                <span className="font-semibold text-red-600 dark:text-red-400">{result.errors.length}건</span>
              </>
            )}
          </p>

          {result.errors.length > 0 && (
            <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-red-600 dark:text-red-400">
              {result.errors.slice(0, 20).map((err, i) => (
                <li key={i}>
                  {err.row}행: {err.reason}
                </li>
              ))}
              {result.errors.length > 20 && <li>...외 {result.errors.length - 20}건</li>}
            </ul>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={runImport}
              disabled={result.valid.length === 0 || importing}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? '가져오는 중...' : `${result.valid.length}건 가져오기`}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={importing}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
