import {randomUUID} from 'crypto';
import {promises as fs} from 'fs';
import path from 'path';
import type {FeedbackCategory, FeedbackSubmission} from '@/lib/feedback/types';

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE = 'feedback.json';

async function ensureDir() {
  await fs.mkdir(DATA_DIR, {recursive: true});
}

async function readAll(): Promise<FeedbackSubmission[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, FILE), 'utf8');
    return JSON.parse(raw) as FeedbackSubmission[];
  } catch {
    return [];
  }
}

export async function saveFeedback(input: {
  user_id: string | null;
  email: string;
  category: FeedbackCategory;
  rating: number | null;
  message: string;
  page_path: string | null;
  user_agent: string | null;
}): Promise<FeedbackSubmission> {
  const rows = await readAll();
  const row: FeedbackSubmission = {
    id: randomUUID(),
    user_id: input.user_id,
    email: input.email,
    category: input.category,
    rating: input.rating,
    message: input.message,
    page_path: input.page_path,
    user_agent: input.user_agent,
    created_at: new Date().toISOString(),
  };
  rows.push(row);
  await fs.writeFile(path.join(DATA_DIR, FILE), JSON.stringify(rows, null, 2));
  return row;
}
