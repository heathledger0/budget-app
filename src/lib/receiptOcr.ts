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
const RUNNING_TOTAL = /(?:잔액|누적)\s*[\d,.]+/;

// Boilerplate stripped out (as substrings, not whole lines) when guessing the label
// from free-form text: the merchant name often shares an OCR line with one of these,
// e.g. "11/13 16:51 동아마트 누적1,769,980원".
const NOISE_SUBSTRING_PATTERNS = [
  /^.*(?:발신자|스팸|수\s*있습니다|알고\s*있음).*$/gm, // messages-app unknown-sender warning + its buttons
  /^[^\n]*승인/gm, // issuer + masked card digits + "승인", e.g. "하나2*6*승인"
  /\[[^\]\n]*\]/g, // "[Web발신]"
  /web\s*발신/gi,
  /[가-힣]\s*\*\s*[가-힣]{1,2}/g, // masked cardholder name, e.g. "권*혁"
  /일시불|할부/g,
  /(?:잔액|누적|한도|포인트)\s*[\d,.]+\s*원?/g,
  /\d{1,3}(?:[,.]\d{3})+\s*원?|\d+\s*원/g, // amounts
  /\d{1,2}\s*[/.]\s*\d{1,2}(?:\s*\d{1,2}\s*[:.]\s*\d{2})?/g, // date (+ optional time)
  /\(?\s*(?:오늘|어제|그제)\s*\)?/g,
  /오전|오후/g,
  /\d{1,2}\s*[:.]\s*\d{2}/g, // stray times, incl. the phone status-bar clock
  /카드/g,
];

// The three landmarks of a Korean card-approval text, in the order they appear in
// one message: "[Web발신]" → "…승인" → "일시불/할부". OCR regularly misreads any one of
// them (the Latin "Web" in particular), so a message is located by whichever survive.
const MESSAGE_MARKERS = [/발신\s*\]/g, /승인/g, /일시불|할부/g];

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
// 5,500원 일시불"). OCR mangles it often — "원" read as "8" or ")", the comma read as
// a space or dropped ("26,0008", "5 500)", "55008") — so it's parsed by position.
function approvalAmount(text: string): number | undefined {
  const match = text.match(/승인[^\d]*?(\d{1,3}(?:[,. ]\d{3})+|\d+)(\s*원)?/);
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
    approvalAmount(text) ??
    firstAmount(text, /(\d{1,3}(?:,\d{3})+|\d{4,})\s*원/g) ??
    firstAmount(text, /(\d{1,3}(?:,\d{3})+)/g)
  );
}

function tidyLabel(raw: string): string | undefined {
  const label = raw
    .replace(/\s+/g, ' ')
    .replace(/^(?:[\d/:.,*-]+ )+/, '') // leftover leading number tokens
    .trim();
  return /[가-힣a-zA-Z]{2,}/.test(label) ? label : undefined;
}

function extractLabel(text: string): string | undefined {
  // Everything after the running total (timestamp between bubbles, the messages
  // app's own warning/buttons) belongs to the screen, not to this transaction.
  const totalAt = text.search(RUNNING_TOTAL);
  const body = totalAt >= 0 ? text.slice(0, totalAt) : text;

  // Approval texts put the merchant right after "MM/DD HH:MM" on the same line.
  const approvedAt = body.indexOf('승인');
  if (approvedAt >= 0) {
    const afterTime = body.slice(approvedAt).match(/\d{1,2}\s*:\s*\d{2}[ \t]+([^\n]+)/);
    const label = afterTime && tidyLabel(afterTime[1]);
    if (label) return label;
  }

  let cleaned = body;
  for (const pattern of NOISE_SUBSTRING_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  const candidates = cleaned
    .split('\n')
    .map(tidyLabel)
    .filter((l): l is string => l !== undefined);
  return [...candidates].sort((a, b) => b.length - a.length)[0];
}

function validDay(month: string, day: string): number | undefined {
  const m = Number(month);
  const d = Number(day);
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? d : undefined;
}

function extractDay(text: string): number | undefined {
  const patterns = [
    /(?<![\d,.])(\d{1,2})\s*[/.]\s*(\d{1,2})\s+\d{1,2}\s*:\s*\d{2}/g, // "11/15 13:08"
    /(?<![\d,.])(\d{2})[17lI|]?(\d{2})\s+\d{1,2}\s*:\s*\d{2}/g, // "/" misread or dropped: "11715 13:08"
    /(?<![\d,.])(\d{1,2})\s*[/.월]\s*(\d{1,2})(?![\d,]|\s*원)/g, // date on its own
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const day = validDay(match[1], match[2]);
      if (day) return day;
    }
  }
  return undefined;
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
    // An approval text whose amount couldn't be read is still listed (amount left
    // blank for the user to fill in) rather than silently dropped.
    const parsed = blocks
      .map(parseBlock)
      .filter((item) => item.amount !== undefined || item.rawText.includes('승인'));
    return { rawText, items: parsed.length > 0 ? parsed : [parseBlock(rawText)] };
  } finally {
    await worker.terminate();
  }
}
