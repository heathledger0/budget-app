// Turns the text of Korean card / bank notification messages — pasted directly or read
// off a screenshot by OCR — into transaction drafts. Kept free of imports so it can be
// exercised on plain strings outside the browser.

export interface ParsedReceipt {
  rawText: string;
  amount?: number;
  label?: string;
  month?: number;
  day?: number;
  categoryId?: string;
  // 'in' for money received (bank 입금), 'out' for spending / withdrawals.
  direction: 'in' | 'out';
}

// Lines that mention these nearby are a running balance/limit, not the actual charge amount.
const BALANCE_KEYWORDS = ['잔액', '누적', '한도', '포인트'];
const RUNNING_TOTAL = /(?:잔액|누적)\s*[\d,.]+/;

const BANK_NAMES =
  '신한|국민|우리|하나|농협|기업|SC제일|제일|씨티|카카오뱅크|케이뱅크|토스뱅크|새마을금고|새마을|우체국|수협|신협|부산|대구|경남|광주|전북|제주|IBK|KB|NH';

// Boilerplate stripped out (as substrings, not whole lines) when guessing the label
// from free-form text: the merchant name often shares an OCR line with one of these,
// e.g. "11/13 16:51 동아마트 누적1,769,980원".
const NOISE_SUBSTRING_PATTERNS = [
  /^.*(?:발신자|스팸|수\s*있습니다|알고\s*있음).*$/gm, // messages-app unknown-sender warning + its buttons
  /^[^\n]*승인/gm, // issuer + masked card digits + "승인", e.g. "하나2*6*승인"
  /\[[^\]\n]*\]/g, // "[Web발신]", "[KB]"
  /web\s*발신/gi,
  new RegExp(`(?<![가-힣A-Za-z])(?:${BANK_NAMES})(?:은행|뱅크)?(?![가-힣A-Za-z])`, 'g'),
  /\d[\d*-]{5,}\d/g, // account numbers, e.g. "110-***-456789", "123456**789"
  /[가-힣]\s*\*\s*[가-힣]{1,2}/g, // masked cardholder name, e.g. "권*혁"
  /일시불|할부/g,
  /(?:전자금융|타행|자동|인터넷|모바일|스마트)(?=입금|출금|이체|송금)/g,
  /체크카드|체크(?=승인|출금)/g,
  /입금|출금|이체|송금/g,
  /(?:잔액|누적|한도|포인트)\s*[\d,.]+\s*원?/g,
  /\d{1,3}(?:[,.]\d{3})+\s*원?|\d+\s*원/g, // amounts
  /\d{1,2}\s*[/.]\s*\d{1,2}(?:[\s,]*\d{1,2}\s*[:.]\s*\d{2})?/g, // date (+ optional time)
  /\(?\s*(?:오늘|어제|그제)\s*\)?/g,
  /오전|오후/g,
  /\d{1,2}\s*[:.]\s*\d{2}/g, // stray times, incl. the phone status-bar clock
  /카드/g,
];

// Landmarks of one notification message, in the order they appear in it: a header
// ("[Web발신]", "[KB]", or a bank name + date line like "우리 11/17 09:00") → "…승인" or
// "입금/출금" → "일시불/할부". OCR regularly misreads any one of them (the Latin "Web" in
// particular), so a message is located by whichever survive.
const MESSAGE_MARKERS = [
  new RegExp(
    `\\[[^\\]\\n]{0,12}\\]|발신\\s*\\]|^[ \\t]*(?:${BANK_NAMES})(?:은행)?[ \\t,]*\\d{1,2}\\s*[/.]\\s*\\d{1,2}`,
    'gm',
  ),
  /승인|입금|출금|이체/g,
  /일시불|할부/g,
];

const CATEGORY_KEYWORDS: { keywords: string[]; categoryId: string }[] = [
  { keywords: ['스타벅스', '이디야', '투썸', '커피', '카페', '빽다방', '메가커피', '커피빈'], categoryId: 'cafe' },
  { keywords: ['gs25', 'cu', '세븐일레븐', '이마트24', '미니스톱', '씨유'], categoryId: 'convenienceStore' },
  { keywords: ['쿠팡', '마켓컬리', '다이소', '올리브영', '이마트', '홈플러스', '롯데마트', '마트'], categoryId: 'daily' },
  { keywords: ['버스', '지하철', '택시', '카카오t', '교통카드', 'ktx', '주유'], categoryId: 'transport' },
  { keywords: ['병원', '의원', '약국', '한의원', '치과'], categoryId: 'medical' },
  { keywords: ['skt', 'kt', 'lgu+', '엘지유플러스', '통신'], categoryId: 'telecom' },
  { keywords: ['넷플릭스', '왓챠', '유튜브', '멜론', '지니뮤직', 'netflix'], categoryId: 'subscription' },
  { keywords: ['cgv', '롯데시네마', '메가박스', '영화', '공연', '전시', '놀이공원', '에버랜드', '롯데월드'], categoryId: 'culture' },
  { keywords: ['국밥', '순대', '순댓국', '닭강정', '치킨', '피자', '김밥', '분식', '버거', '식당', '맥도날드', '롯데리아', '배달의민족', '요기요'], categoryId: 'food' },
];

const INCOME_KEYWORDS: { keywords: string[]; categoryId: string }[] = [
  { keywords: ['급여', '월급', '상여'], categoryId: 'salary' },
  { keywords: ['이자', '결산'], categoryId: 'interest' },
];

function toAmount(raw: string): number | undefined {
  const value = Number(raw.replace(/[,.]/g, ''));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function firstAmount(text: string, regex: RegExp): number | undefined {
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const context = text.slice(Math.max(0, match.index - 8), match.index);
    if (BALANCE_KEYWORDS.some((kw) => context.includes(kw))) continue;
    const value = toAmount(match[1]);
    if (value) return value;
  }
  return undefined;
}

// The charge in an approval text is the first number after "승인" ("…승인 권*혁
// 5,500원 일시불"); in a bank text it's the first number after "입금/출금"
// ("출금 50,000", "전자금융출금\n50,000"). OCR mangles it often — "원" read as "8" or
// ")", the comma read as a space or dropped ("26,0008", "5 500)", "55008") — so it's
// parsed by position.
function keywordAmount(text: string): number | undefined {
  const match = text.match(/(?:승인|입금|출금|이체)[^\d]*?(\d{1,3}(?:[,. ]\d{3})+|\d+)(\s*원)?/);
  if (!match) return undefined;
  let digits = match[1].replace(/[,. ]/g, '');
  const grouped = digits.length !== match[1].length;
  // "55008": no separator, no "원", and dropping a trailing 8 leaves a round
  // amount — that 8 is almost certainly the misread "원" of "5,500원".
  if (!grouped && !match[2] && /^\d{2,}08$/.test(digits)) digits = digits.slice(0, -1);
  return toAmount(digits);
}

function extractAmount(text: string): number | undefined {
  return (
    keywordAmount(text) ??
    firstAmount(text, /(\d{1,3}(?:,\d{3})+|\d{4,})\s*원/g) ??
    firstAmount(text, /(\d{1,3}(?:,\d{3})+)/g)
  );
}

function tidyLabel(raw: string): string | undefined {
  const label = raw
    .replace(/\s+/g, ' ')
    .replace(/^(?:[\d/:.,*-]+ )+/, '') // leftover leading number tokens
    .replace(/^[\s,.:/-]+|[\s,.:/-]+$/g, '')
    .trim();
  return /[가-힣a-zA-Z]{2,}/.test(label) ? label : undefined;
}

function extractLabel(text: string): string | undefined {
  // Approval texts put the merchant right after "MM/DD HH:MM" on the same line.
  // Everything after the running total (timestamp between bubbles, the messages
  // app's own warning/buttons) belongs to the screen, not to this transaction.
  const approvedAt = text.indexOf('승인');
  if (approvedAt >= 0) {
    const totalAt = text.search(RUNNING_TOTAL);
    const body = totalAt >= 0 ? text.slice(0, totalAt) : text;
    const afterTime = body.slice(approvedAt).match(/\d{1,2}\s*:\s*\d{2}[ \t]+([^\n]+)/);
    const label = afterTime && tidyLabel(afterTime[1]);
    if (label) return label;
  }

  // Otherwise (bank texts, free-form text) strip everything that's recognizably not a
  // name — bank names, account numbers, amounts, dates — and keep the longest leftover.
  // Bank texts often put the counterparty after the balance, so nothing is cut here.
  let cleaned = text;
  for (const pattern of NOISE_SUBSTRING_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  const candidates = cleaned
    .split('\n')
    .map(tidyLabel)
    .filter((l): l is string => l !== undefined);
  return [...candidates].sort((a, b) => b.length - a.length)[0];
}

function validDate(month: string, day: string): { month: number; day: number } | undefined {
  const m = Number(month);
  const d = Number(day);
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? { month: m, day: d } : undefined;
}

function extractDate(text: string): { month?: number; day?: number } {
  const patterns = [
    /(?<!\d)(\d{1,2})\s*[/.]\s*(\d{1,2})[\s,]+\d{1,2}\s*:\s*\d{2}/g, // "11/15 13:08", "11/15,13:08"
    /(?<![\d,.])(\d{2})[17lI|]?(\d{2})\s+\d{1,2}\s*:\s*\d{2}/g, // "/" misread or dropped: "11715 13:08"
    /(?<![\d,.])(\d{1,2})\s*[/.월]\s*(\d{1,2})(?![\d,]|\s*원)/g, // date on its own
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const date = validDate(match[1], match[2]);
      if (date) return date;
    }
  }
  return {};
}

function guessCategory(
  label: string | undefined,
  text: string,
  direction: 'in' | 'out',
): string | undefined {
  if (direction === 'in') {
    const haystack = text.toLowerCase();
    return INCOME_KEYWORDS.find(({ keywords }) => keywords.some((kw) => haystack.includes(kw)))
      ?.categoryId;
  }
  if (!label) return undefined;
  const lower = label.toLowerCase();
  return CATEGORY_KEYWORDS.find(({ keywords }) =>
    keywords.some((kw) => lower.includes(kw.toLowerCase())),
  )?.categoryId;
}

function parseBlock(block: string): ParsedReceipt {
  const direction = /입금/.test(block) && !/출금|승인/.test(block) ? 'in' : 'out';
  const amount = extractAmount(block);
  const label = extractLabel(block);
  const { month, day } = extractDate(block);
  const categoryId = guessCategory(label, block, direction);
  return { rawText: block, amount, label, month, day, categoryId, direction };
}

// Splits text into one chunk per notification message, dropping anything before the
// first one (phone status bar, back button, etc.). Text with no marker at all — a single
// receipt, a bank app's own screen, a hand-typed line — comes back as one chunk.
function splitMessageBlocks(text: string): string[] {
  const found: { index: number; rank: number }[] = [];
  MESSAGE_MARKERS.forEach((marker, rank) => {
    for (const match of text.matchAll(marker)) found.push({ index: match.index, rank });
  });
  if (found.length === 0) return [text];
  found.sort((a, b) => a.index - b.index);
  // Markers come in a fixed order within one message, so a marker that doesn't come
  // later in that order than the previous one must belong to the next message.
  const starts: number[] = [];
  let lastRank = Infinity;
  for (const { index, rank } of found) {
    if (rank <= lastRank) starts.push(text.lastIndexOf('\n', index) + 1);
    lastRank = rank;
  }
  return starts.map((start, i) => text.slice(start, starts[i + 1] ?? text.length));
}

// Best-effort: callers should treat every item as a prefill to confirm/edit, never as
// a final value. A message whose amount couldn't be read is still listed (amount left
// blank) rather than silently dropped.
export function parseMessages(text: string): ParsedReceipt[] {
  const parsed = splitMessageBlocks(text)
    .map(parseBlock)
    .filter((item) => item.amount !== undefined || /승인|입금|출금|이체/.test(item.rawText));
  return parsed.length > 0 ? parsed : [parseBlock(text)];
}
