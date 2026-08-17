import {randomUUID} from 'crypto';
import {promises as fs} from 'fs';
import path from 'path';
import {createServiceClient} from '@/lib/supabase/admin';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import type {WhiteboardBoard, WhiteboardDebrief, DeliverableAssessment} from '@/lib/whiteboard/chat';

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

function useRemoteStore(): boolean {
  return (
    isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_KEY?.trim())
  );
}

async function ensureDirs() {
  await fs.mkdir(SKETCH_DIR, {recursive: true});
}

function parseBoard(value: unknown): WhiteboardBoard {
  const row = (value && typeof value === 'object' ? value : {}) as Record<
    string,
    unknown
  >;
  return {
    framing: String(row.framing ?? ''),
    users: String(row.users ?? ''),
    flows: String(row.flows ?? ''),
    solution: String(row.solution ?? ''),
    tradeoffs: String(row.tradeoffs ?? ''),
  };
}

function parseDebrief(value: unknown): WhiteboardDebrief {
  const row = (value && typeof value === 'object' ? value : {}) as Record<
    string,
    unknown
  >;
  const deliverables = Array.isArray(row.deliverables)
    ? row.deliverables.map((item) => {
        const d = (item && typeof item === 'object' ? item : {}) as Record<
          string,
          unknown
        >;
        const status: DeliverableAssessment['status'] =
          d.status === 'met' || d.status === 'partial' || d.status === 'missed'
            ? d.status
            : 'missed';
        return {
          item: String(d.item ?? ''),
          status,
          note: String(d.note ?? ''),
        } satisfies DeliverableAssessment;
      })
    : [];

  return {
    score: typeof row.score === 'number' ? row.score : Number(row.score) || 0,
    againstAsk: String(row.againstAsk ?? ''),
    summary: String(row.summary ?? ''),
    deliverables,
    strengths: Array.isArray(row.strengths)
      ? row.strengths.map(String)
      : [],
    improvements: Array.isArray(row.improvements)
      ? row.improvements.map(String)
      : [],
    criteriaHit: Array.isArray(row.criteriaHit)
      ? row.criteriaHit.map(String)
      : [],
    criteriaMissed: Array.isArray(row.criteriaMissed)
      ? row.criteriaMissed.map(String)
      : [],
    sketchAssessment: String(row.sketchAssessment ?? ''),
    stub: Boolean(row.stub),
  };
}

function mapRemoteSession(row: Record<string, unknown>): WhiteboardSessionRecord {
  const id = String(row.id);
  const hasSketch = Boolean(row.has_sketch);
  const sketchStored = typeof row.sketch_png_base64 === 'string' && row.sketch_png_base64.length > 0;
  return {
    id,
    userId: String(row.user_id),
    challengeId: String(row.challenge_id),
    challengeTitle: String(row.challenge_title),
    board: parseBoard(row.board_json),
    clarifyingUsed: Number(row.clarifying_used) || 0,
    score: Number(row.score) || 0,
    debrief: parseDebrief(row.debrief_json),
    sketchUrl: hasSketch || sketchStored ? `/api/whiteboard/sketches/${id}.png` : null,
    hasSketch: hasSketch || sketchStored,
    secondsRemaining: Number(row.seconds_remaining) || 0,
    durationMinutes: Number(row.duration_minutes) || 25,
    createdAt: String(row.created_at),
  };
}

function extractPngBase64(dataUrl: string): string | null {
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
  if (!match?.[1]) return null;
  if (match[1].length > 8_000_000) {
    throw new Error('Sketch is too large');
  }
  return match[1];
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
  const base64 = extractPngBase64(dataUrl);
  if (!base64) return null;

  if (useRemoteStore()) {
    // Remote sketches are stored on the session row; URL stays route-shaped.
    return `/api/whiteboard/sketches/${sessionId}.png`;
  }

  if (process.env.VERCEL) {
    throw new Error(
      'Whiteboard sketch save needs SUPABASE_SERVICE_KEY on hosted deploys.',
    );
  }

  await ensureDirs();
  const fileName = `${sessionId}.png`;
  await fs.writeFile(path.join(SKETCH_DIR, fileName), Buffer.from(base64, 'base64'));
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

/** Load PNG bytes for a sketch file name (`{sessionId}.png`). */
export async function getSketchBytes(
  fileName: string,
  userId: string,
): Promise<Buffer | null> {
  if (!/^[a-zA-Z0-9._-]+\.png$/.test(fileName)) return null;
  const sessionId = fileName.replace(/\.png$/i, '');

  if (useRemoteStore()) {
    const admin = createServiceClient();
    const {data, error} = await admin
      .from('whiteboard_sessions')
      .select('sketch_png_base64, user_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || String(data.user_id) !== userId) return null;
    const b64 = data.sketch_png_base64;
    if (typeof b64 !== 'string' || !b64) return null;
    return Buffer.from(b64, 'base64');
  }

  const full = await getSketchPath(fileName);
  if (!full) return null;
  const session = await getWhiteboardSession(sessionId, userId);
  if (!session) return null;
  return fs.readFile(full);
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

  const sketchBase64 = input.sketchDataUrl
    ? extractPngBase64(input.sketchDataUrl)
    : null;

  if (useRemoteStore()) {
    const admin = createServiceClient();
    const id = randomUUID();
    const {data, error} = await admin
      .from('whiteboard_sessions')
      .insert({
        id,
        user_id: input.userId,
        challenge_id: input.challengeId,
        challenge_title: input.challengeTitle,
        board_json: input.board,
        clarifying_used: input.clarifyingUsed,
        score: input.debrief.score,
        debrief_json: input.debrief,
        sketch_png_base64: sketchBase64,
        has_sketch: Boolean(sketchBase64 || input.hasSketch),
        seconds_remaining: input.secondsRemaining,
        duration_minutes: input.durationMinutes,
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Could not save whiteboard session');
    }
    return mapRemoteSession(data as Record<string, unknown>);
  }

  if (process.env.VERCEL) {
    throw new Error(
      'Whiteboard save needs SUPABASE_SERVICE_KEY on hosted deploys (local .data/ is read-only).',
    );
  }

  const rows = await readSessions();
  const id = randomUUID();

  let sketchUrl: string | null = null;
  if (input.sketchDataUrl) {
    sketchUrl = await saveSketchPng(id, input.sketchDataUrl);
  }

  const session: WhiteboardSessionRecord = {
    id,
    userId: input.userId,
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

  if (useRemoteStore()) {
    const admin = createServiceClient();
    const {data, error} = await admin
      .from('whiteboard_sessions')
      .select(
        'id, user_id, challenge_id, challenge_title, board_json, clarifying_used, score, debrief_json, has_sketch, seconds_remaining, duration_minutes, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', {ascending: false})
      .limit(50);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, unknown>[]).map(mapRemoteSession);
  }

  if (process.env.VERCEL) {
    return [];
  }

  const rows = await readSessions();
  return rows.filter((r) => r.userId === userId);
}

export async function getWhiteboardSession(
  id: string,
  userId: string,
): Promise<WhiteboardSessionRecord | null> {
  if (!userId || !id) return null;

  if (useRemoteStore()) {
    const admin = createServiceClient();
    const {data, error} = await admin
      .from('whiteboard_sessions')
      .select(
        'id, user_id, challenge_id, challenge_title, board_json, clarifying_used, score, debrief_json, has_sketch, seconds_remaining, duration_minutes, created_at',
      )
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapRemoteSession(data as Record<string, unknown>);
  }

  if (process.env.VERCEL) {
    return null;
  }

  const rows = await readSessions();
  return rows.find((r) => r.id === id && r.userId === userId) ?? null;
}
