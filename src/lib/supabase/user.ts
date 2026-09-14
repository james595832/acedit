import {cache} from 'react';
import type {User} from '@supabase/supabase-js';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {createClient} from '@/lib/supabase/server';

/** One auth lookup per request — layout and pages share this. */
export const getAuthUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const {
      data: {user},
    } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
});
