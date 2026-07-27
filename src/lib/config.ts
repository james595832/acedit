/**
 * Provider mode helpers.
 * Missing keys → stub implementations (free local development).
 * When keys are present, prefer the cheapest viable models.
 */

export function useStubs(): boolean {
  return process.env.USE_STUBS === 'true' || !process.env.ANTHROPIC_API_KEY;
}

export function hasSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function hasDeepgram(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY && process.env.USE_STUBS !== 'true');
}

export function hasBlob(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN && process.env.USE_STUBS !== 'true',
  );
}

/** Cheapest Anthropic chat model for MVP work. */
export const CHEAP_ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
