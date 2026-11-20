import { createWorker } from 'tesseract.js';
import { parseMessages, type ParsedReceipt } from './messageParser';

export type { ParsedReceipt };

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

// Runs OCR on a screenshot of card / bank notification messages and parses each
// message found into a draft (see parseMessages).
export async function recognizeReceipts(
  image: File | Blob,
): Promise<{ rawText: string; items: ParsedReceipt[] }> {
  const worker = await createWorker('kor+eng');
  try {
    const processed = await preprocessImage(image);
    const { data } = await worker.recognize(processed);
    return { rawText: data.text, items: parseMessages(data.text) };
  } finally {
    await worker.terminate();
  }
}
