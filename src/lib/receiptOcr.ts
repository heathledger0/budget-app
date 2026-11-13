import { createWorker } from 'tesseract.js';

export interface ParsedReceipt {
  rawText: string;
  amount?: number;
  label?: string;
  day?: number;
  categoryId?: string;
}

// Lines that mention these nearby are a running balance/limit, not the actual charge amount.
const BALANCE_KEYWORDS = ['잔액', '누적', '한도', '포인트'];

// Boilerplate lines common in Korean card-approval texts / bank app screenshots —
// never the merchant name, so they're excluded when guessing the label.
const NOISE_LINE_PATTERNS = [
  /web\s*발신/i,
  /승인/,
  /일시불|할부/,
  /카드/,
  /잔액|누적|한도/,
  /^[\d/:.\s%,-]+$/, // pure date/time/number lines
  /원\s*$/, // amount-only lines
];

const CATEGORY_KEYWORDS: { keywords: string[]; categoryId: string }[] = [
  { keywords: ['스타벅스', '이디야', '투썸', '커피', '카페', '빽다방', '메가커피', '커피빈'], categoryId: 'cafe' },
  { keywords: ['gs25', 'cu', '세븐일레븐', '이마트24', '미니스톱', '씨유'], categoryId: 'convenienceStore' },
  { keywords: ['쿠팡', '마켓컬리', '다이소', '올리브영', '이마트', '홈플러스', '롯데마트', '마트'], categoryId: 'daily' },
  { keywords: ['버스', '지하철', '택시', '카카오t', '교통카드', 'ktx', '주유'], categoryId: 'transport' },
  { keywords: ['병원', '의원', '약국', '한의원', '치과'], categoryId: 'medical' },
  { keywords: ['skt', 'kt', 'lgu+', '엘지유플러스', '통신'], categoryId: 'telecom' },
  { keywords: ['넷플릭스', '왓챠', '유튜브', '멜론', '지니뮤직', 'netflix'], categoryId: 'subscription' },
];

function extractAmount(text: string): number | undefined {
  const regex = /([\d]{1,3}(?:,\d{3})+|\d{4,})\s*원/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const context = text.slice(Math.max(0, match.index - 8), match.index);
    if (BALANCE_KEYWORDS.some((kw) => context.includes(kw))) continue;
    const value = Number(match[1].replace(/,/g, ''));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

function extractLabel(text: string): string | undefined {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const candidates = lines.filter((line) => {
    if (NOISE_LINE_PATTERNS.some((p) => p.test(line))) return false;
    return /[가-힣a-zA-Z]{2,}/.test(line);
  });
  return [...candidates].sort((a, b) => b.length - a.length)[0];
}

function extractDay(text: string): number | undefined {
  const match = text.match(/(\d{1,2})\s*[/.월]\s*(\d{1,2})\s*일?/);
  if (!match) return undefined;
  const day = Number(match[2]);
  return day >= 1 && day <= 31 ? day : undefined;
}

function guessCategory(label: string | undefined): string | undefined {
  if (!label) return undefined;
  const lower = label.toLowerCase();
  for (const { keywords, categoryId } of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return categoryId;
  }
  return undefined;
}

// Runs OCR on a card-approval text / bank app screenshot and best-effort extracts the
// amount, merchant label, day, and a guessed category. Accuracy depends heavily on the
// screenshot's layout, so callers should treat the result as a prefill to confirm/edit,
// never as a final value.
export async function recognizeReceipt(image: File | Blob): Promise<ParsedReceipt> {
  const worker = await createWorker('kor+eng');
  try {
    const { data } = await worker.recognize(image);
    const rawText = data.text;
    const amount = extractAmount(rawText);
    const label = extractLabel(rawText);
    const day = extractDay(rawText);
    const categoryId = guessCategory(label);
    return { rawText, amount, label, day, categoryId };
  } finally {
    await worker.terminate();
  }
}
