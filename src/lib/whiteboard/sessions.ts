import {randomUUID} from 'crypto';
import {promises as fs} from 'fs';
import path from 'path';
import type {WhiteboardBoard, WhiteboardDebrief} from '@/lib/whiteboard/chat';

const DATA_DIR = path.join(process.cwd(), '.data', 'whiteboard');
const SESSIONS_FILE = 'sessions.json';
const SKETCH_DIR = path.join(DATA_DIR, 'sketches');

export type WhiteboardSessionRecord = {
  id: string;
  userId: string;
  challengeId: string;
  challengeTitle: string;
  board: WhiteboardBoard;
  clarifyingUsed: number;
  score: number;
  debrief: WhiteboardDebrief;
  sketchUrl: string | null;
  hasSketch: boolean;
  secondsRemaining: number;
  durationMinutes: number;
  createdAt: string;
};

async function ensureDirs() {
  await fs.mkdir(SKETCH_DIR, {recursive: true});
}

async function readSessions(): Promise<WhiteboardSessionRecord[]> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, SESSIONS_FILE), 'utf8');
    return JSON.parse(raw) as WhiteboardSessionRecord[];
  } catch {
    return [];
  }
}

async function writeSessions(rows: WhiteboardSessionRecord[]) {
  await ensureDirs();
  await fs.writeFile(
    path.join(DATA_DIR, SESSIONS_FILE),
    JSON.stringify(rows, null, 2),
  );
}

export async function saveSketchPng(
  sessionId: string,
  dataUrl: string,
): Promise<string | null> {
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
  if (!match?.[1]) return null;
  if (match[1].length > 8_000_000) {
    throw new Error('Sketch is too large');
  }
  await ensureDirs();
  const fileName = `${sessionId}.png`;
  await fs.writeFile(
    path.join(SKETCH_DIR, fileName),
    Buffer.from(match[1], 'base64'),
  );
  return `/api/whiteboard/sketches/${fileName}`;
}

export async function getSketchPath(fileName: string): Promise<string | null> {
  if (!/^[a-zA-Z0-9._-]+\.png$/.test(fileName)) return null;
  const full = path.join(SKETCH_DIR, fileName);
  try {
    await fs.access(full);
    return full;
  } catch {
    return null;
  }
}

export async function saveWhiteboardSession(input: {
  userId: string;
  challengeId: string;
  challengeTitle: string;
  board: WhiteboardBoard;
  clarifyingUsed: number;
  debrief: WhiteboardDebrief;
  sketchDataUrl?: string | null;
  hasSketch: boolean;
  secondsRemaining: number;
  durationMinutes: number;
}): Promise<WhiteboardSessionRecord> {
  if (!input.userId) {
    throw new Error('userId is required');
  }
  const rows = await readSessions();
  const userId = input.userId;
  const id = randomUUID();

  let sketchUrl: string | null = null;
  if (input.sketchDataUrl) {
    sketchUrl = await saveSketchPng(id, input.sketchDataUrl);
  }

  const session: WhiteboardSessionRecord = {
    id,
    userId,
    challengeId: input.challengeId,
    challengeTitle: input.challengeTitle,
    board: input.board,
    clarifyingUsed: input.clarifyingUsed,
    score: input.debrief.score,
    debrief: input.debrief,
    sketchUrl,
    hasSketch: Boolean(sketchUrl),
    secondsRemaining: input.secondsRemaining,
    durationMinutes: input.durationMinutes,
    createdAt: new Date().toISOString(),
  };

  rows.unshift(session);
  await writeSessions(rows.slice(0, 200));
  return session;
}

export async function listWhiteboardSessions(
  userId: string,
): Promise<WhiteboardSessionRecord[]> {
  if (!userId) return [];
  const rows = await readSessions();
  return rows.filter((r) => r.userId === userId);
}

export async function getWhiteboardSession(
  id: string,
  userId: string,
): Promise<WhiteboardSessionRecord | null> {
  if (!userId || !id) return null;
  const rows = await readSessions();
  return rows.find((r) => r.id === id && r.userId === userId) ?? null;
}
