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
  /^\d{1,2}\s*[:.]\s*\d{2}$/, // phone status-bar clock (e.g. "6:37")
];

// Marks the start of each Korean card-approval text in a messages-app screenshot.
const MESSAGE_MARKER = /web\s*발신/gi;

const CATEGORY_KEYWORDS: { keywords: string[]; categoryId: string }[] = [
  { keywords: ['스타벅스', '이디야', '투썸', '커피', '카페', '빽다방', '메가커피', '커피빈'], categoryId: 'cafe' },
  { keywords: ['gs25', 'cu', '세븐일레븐', '이마트24', '미니스톱', '씨유'], categoryId: 'convenienceStore' },
  { keywords: ['쿠팡', '마켓컬리', '다이소', '올리브영', '이마트', '홈플러스', '롯데마트', '마트'], categoryId: 'daily' },
  { keywords: ['버스', '지하철', '택시', '카카오t', '교통카드', 'ktx', '주유'], categoryId: 'transport' },
  { keywords: ['병원', '의원', '약국', '한의원', '치과'], categoryId: 'medical' },
  { keywords: ['skt', 'kt', 'lgu+', '엘지유플러스', '통신'], categoryId: 'telecom' },
  { keywords: ['넷플릭스', '왓챠', '유튜브', '멜론', '지니뮤직', 'netflix'], categoryId: 'subscription' },
  { keywords: ['cgv', '롯데시네마', '메가박스', '영화', '공연', '전시', '놀이공원', '에버랜드', '롯데월드'], categoryId: 'culture' },
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

function parseBlock(block: string): ParsedReceipt {
  const amount = extractAmount(block);
  const label = extractLabel(block);
  const day = extractDay(block);
  const categoryId = guessCategory(label);
  return { rawText: block, amount, label, day, categoryId };
}

// Splits OCR text from a messages-app screenshot into one chunk per card-approval
// text (each starts with "Web발신"), dropping anything before the first one (phone
// status bar, back button, etc.). A screenshot with no such marker — a single receipt
// or a bank app's own screen — comes back as one chunk covering the whole text.
function splitMessageBlocks(text: string): string[] {
  const starts: number[] = [];
  let match: RegExpExecArray | null;
  MESSAGE_MARKER.lastIndex = 0;
  while ((match = MESSAGE_MARKER.exec(text))) starts.push(match.index);
  if (starts.length === 0) return [text];
  return starts.map((start, i) => text.slice(start, starts[i + 1] ?? text.length));
}

// Runs OCR on a card-approval text / bank app screenshot and best-effort extracts the
// amount, merchant label, day, and a guessed category for each transaction found.
// A screenshot of several stacked "Web발신" texts (e.g. a messages app thread) yields
// one item per text instead of mixing fields from different transactions together.
// Accuracy depends heavily on the screenshot's layout, so callers should treat every
// item as a prefill to confirm/edit, never as a final value.
export async function recognizeReceipts(
  image: File | Blob,
): Promise<{ rawText: string; items: ParsedReceipt[] }> {
  const worker = await createWorker('kor+eng');
  try {
    const { data } = await worker.recognize(image);
    const rawText = data.text;
    const blocks = splitMessageBlocks(rawText);
    const parsed = blocks.map(parseBlock).filter((item) => item.amount !== undefined);
    return { rawText, items: parsed.length > 0 ? parsed : [parseBlock(rawText)] };
  } finally {
    await worker.terminate();
  }
}
