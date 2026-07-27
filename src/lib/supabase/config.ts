/**
 * Returns true when public Supabase Auth env vars are configured.
 * Auth can run without USE_STUBS=false (AI stubs stay independent).
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
