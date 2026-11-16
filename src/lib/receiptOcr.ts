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

// Boilerplate substrings common in Korean card-approval texts / messages-app
// screenshots. These are stripped out (not whole lines dropped) when guessing the
// label, because the merchant name is frequently on the SAME OCR line as one of
// them — e.g. "11/13 16:51 동아마트 누적1,769,980원" has the merchant name sharing a
// line with the running-total amount, so dropping that whole line would lose the
// merchant name too.
const NOISE_SUBSTRING_PATTERNS = [
  // "하나2*6*승인 권*혁" — issuer name + masked card digits + 승인 + masked cardholder
  // name, as one unit, before falling back to the smaller pieces below individually.
  /[가-힣]{1,4}\s*\d\s*\*\s*\d\s*\*?\s*승인\s*[가-힣]\s*\*\s*[가-힣]{1,2}/g,
  /\[[^\]]*\]/g, // "[Web발신]"
  /web\s*발신/gi,
  /\d\s*\*\s*\d(?:\s*\*)?/g, // masked card digits, e.g. "2*6*"
  /승인/g,
  /[가-힣]\s*\*\s*[가-힣]{1,2}/g, // any remaining masked name fragment, e.g. "권*혁"
  /일시불|할부/g,
  /(?:잔액|누적|한도|포인트)\s*[\d,]+\s*원?/g, // running balance/limit + its amount
  /[\d]{1,3}(?:,\d{3})+\s*원|\d{4,}\s*원/g, // any "N,NNN원"/"NNNN원" amount
  /\d{1,2}\s*[/.]\s*\d{1,2}(?:\s*\d{1,2}\s*[:.]\s*\d{2})?/g, // date (+ optional time)
  /\(?\s*(오늘|어제|그제)\s*\)?/g, // relative-day timestamp divider prefix
  /오전|오후/g,
  /\d{1,2}\s*[:.]\s*\d{2}/g, // any remaining stray time, incl. phone status-bar clock
  /알\s*수\s*없는\s*발신자[\s\S]{0,60}?스팸일\s*수\s*있습니다\.?/g, // unknown-sender warning
  /카드/g,
];

// Markers that can each signal the start of a new Korean card-approval text in a
// messages-app screenshot. OCR of the bracketed, mixed-script "[Web발신]" tag is
// unreliable, especially on dark-mode screenshots, so "승인" (always present in the
// approval line itself, pure Hangul) acts as a second, independent signal — a message
// is still found as long as at least one of the two is read correctly.
const MESSAGE_MARKERS = [/web\s*발신/gi, /승인/g];

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
  let cleaned = text;
  for (const pattern of NOISE_SUBSTRING_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  const candidates = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /[가-힣a-zA-Z]{2,}/.test(l));
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

// Tesseract reads light-text-on-dark screenshots (e.g. a dark-mode messages app)
// much less reliably than normal dark-text-on-light ones. If the image is mostly
// dark, invert it before handing it to OCR; on any failure (unsupported browser API,
// tainted canvas, etc.) fall back to the original image untouched.
async function preprocessImage(image: File | Blob): Promise<File | Blob> {
  try {
    const bitmap = await createImageBitmap(image);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return image;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avgBrightness = total / (data.length / 4);
    if (avgBrightness >= 110) return image;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
    ctx.putImageData(imageData, 0, 0);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return blob ?? image;
  } catch {
    return image;
  }
}

function parseBlock(block: string): ParsedReceipt {
  const amount = extractAmount(block);
  const label = extractLabel(block);
  const day = extractDay(block);
  const categoryId = guessCategory(label);
  return { rawText: block, amount, label, day, categoryId };
}

// Splits OCR text from a messages-app screenshot into one chunk per card-approval
// text, dropping anything before the first one (phone status bar, back button, etc.).
// A screenshot with no marker at all — a single receipt or a bank app's own screen —
// comes back as one chunk covering the whole text.
function splitMessageBlocks(text: string): string[] {
  const starts: number[] = [];
  for (const marker of MESSAGE_MARKERS) {
    marker.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = marker.exec(text))) starts.push(match.index);
  }
  if (starts.length === 0) return [text];
  starts.sort((a, b) => a - b);
  // "Web발신" and "승인" of the same message usually land within ~20-30 characters
  // of each other; collapse matches that close together into a single boundary so
  // one message isn't split into two just because both of its markers were read.
  const boundaries: number[] = [];
  for (const start of starts) {
    if (boundaries.length === 0 || start - boundaries[boundaries.length - 1] > 40) {
      boundaries.push(start);
    }
  }
  return boundaries.map((start, i) => text.slice(start, boundaries[i + 1] ?? text.length));
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
    const processed = await preprocessImage(image);
    const { data } = await worker.recognize(processed);
    const rawText = data.text;
    const blocks = splitMessageBlocks(rawText);
    const parsed = blocks.map(parseBlock).filter((item) => item.amount !== undefined);
    return { rawText, items: parsed.length > 0 ? parsed : [parseBlock(rawText)] };
  } finally {
    await worker.terminate();
  }
}
