import type {ReactNode} from 'react';
import {AppFrame} from '@/components/AppFrame';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {createClient} from '@/lib/supabase/server';

export async function AppShellServer({children}: {children: ReactNode}) {
  const configured = isSupabaseConfigured();
  let userEmail: string | null = null;

  if (configured) {
    try {
      const supabase = await createClient();
      const {
        data: {user},
      } = await supabase.auth.getUser();
      userEmail = user?.email ?? null;
    } catch {
      userEmail = null;
    }
  }

  return (
    <AppFrame userEmail={userEmail} supabaseConfigured={configured}>
      {children}
    </AppFrame>
  );
}
