import {createWorker} from 'tesseract.js';

export async function ocrImageToText(bytes: Buffer): Promise<string> {
  const worker = await createWorker('eng');
  try {
    const {
      data: {text},
    } = await worker.recognize(bytes);
    return (text ?? '').replace(/\r/g, '\n').trim();
  } finally {
    await worker.terminate();
  }
}
