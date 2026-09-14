import type {ReactNode} from 'react';
import {AppFrame} from '@/components/AppFrame';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {getAuthUser} from '@/lib/supabase/user';

export async function AppShellServer({children}: {children: ReactNode}) {
  const configured = isSupabaseConfigured();
  const user = configured ? await getAuthUser() : null;

  return (
    <AppFrame
      userEmail={user?.email ?? null}
      supabaseConfigured={configured}
    >
      {children}
    </AppFrame>
  );
}
