import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {resolveGreetingName} from '@/lib/greeting';

export async function resolveCandidateFirstName(): Promise<string> {
  if (!isSupabaseConfigured()) return 'there';
  try {
    const supabase = await createClient();
    const {
      data: {user},
    } = await supabase.auth.getUser();
    if (!user) return 'there';

    let profileName: string | null = null;
    const {data: profile} = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    profileName = (profile?.full_name as string | null) ?? null;

    return resolveGreetingName({
      profileName,
      metaName: (user.user_metadata?.full_name as string | undefined) ?? null,
      givenName: (user.user_metadata?.given_name as string | undefined) ?? null,
      email: user.email ?? null,
    });
  } catch {
    return 'there';
  }
}
