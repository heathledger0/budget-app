import { useMemo, useState } from 'react';
import type { SectionType } from '../../types';
import { useBudgetStore } from '../../store/useBudgetStore';
import { SECTION_LABELS, SECTION_ORDER, categoryById } from '../../constants/categories';
import Money from '../common/Money';

export default function SearchPage() {
  const entries = useBudgetStore((s) => s.entries);
  const [keyword, setKeyword] = useState('');
  const [section, setSection] = useState<SectionType | 'all'>('all');
  const [year, setYear] = useState<number | 'all'>('all');

  const years = useMemo(() => {
    const set = new Set(entries.map((e) => e.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [entries]);

  const results = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return entries
      .filter((e) => {
        const category = categoryById(e.categoryId);
        if (section !== 'all' && category?.section !== section) return false;
        if (year !== 'all' && e.year !== year) return false;
        if (!kw) return true;
        const haystack = [e.label, e.memo ?? '', category?.name ?? ''].join(' ').toLowerCase();
        return haystack.includes(kw);
      })
      .sort((a, b) => b.year - a.year || b.month - a.month || b.day - a.day);
  }, [entries, keyword, section, year]);

  const total = results.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">🔍 지난 항목 검색</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          항목명, 메모, 카테고리로 지난 가계부 기록을 찾아보세요.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-0 flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
            placeholder="예: 스타벅스, 통신비..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
            value={section}
            onChange={(e) => setSection(e.target.value as SectionType | 'all')}
          >
            <option value="all">전체 섹션</option>
            {SECTION_ORDER.map((s) => (
              <option key={s} value={s}>
                {SECTION_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
            value={year}
            onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">전체 연도</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="mb-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>검색결과 {results.length}건</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            합계 <Money amount={total} />
          </span>
        </div>
        {results.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
            {keyword || section !== 'all' || year !== 'all'
              ? '조건에 맞는 항목이 없습니다.'
              : '검색어를 입력하거나 필터를 선택해보세요.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="py-1">날짜</th>
                  <th className="py-1">카테고리</th>
                  <th className="py-1">항목명</th>
                  <th className="py-1">메모</th>
                  <th className="py-1 text-right">금액</th>
                </tr>
              </thead>
              <tbody>
                {results.map((e) => {
                  const category = categoryById(e.categoryId);
                  return (
                    <tr key={e.id} className="border-b border-gray-50 dark:border-gray-700">
                      <td className="whitespace-nowrap py-1.5 text-gray-500 dark:text-gray-400">
                        {e.year}.{e.month}.{e.day}
                      </td>
                      <td className="whitespace-nowrap py-1.5">
                        {category ? `${category.emoji} ${category.name}` : e.categoryId}
                      </td>
                      <td className="py-1.5 text-gray-700 dark:text-gray-300">{e.label}</td>
                      <td className="py-1.5 text-gray-400 dark:text-gray-500">{e.memo ?? ''}</td>
                      <td className="py-1.5 text-right">
                        <Money amount={e.amount} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
