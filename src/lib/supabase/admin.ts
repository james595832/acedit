import {createClient as createSupabaseClient} from '@supabase/supabase-js';
import {isSupabaseConfigured} from '@/lib/supabase/config';

/** Service-role client for webhooks / trusted server writes. Never expose to the browser. */
export function createServiceClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_KEY is not configured');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
