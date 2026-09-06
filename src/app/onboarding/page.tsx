import {Section} from '@astryxdesign/core/Section';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {resolveGreetingName} from '@/lib/greeting';
import {WelcomeOnboarding} from '@/components/WelcomeOnboarding';

export default async function OnboardingPage() {
  let firstName = 'there';

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: {user},
      } = await supabase.auth.getUser();

      let profileName: string | null = null;
      if (user) {
        const {data: profile} = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        profileName = (profile?.full_name as string | null) ?? null;
      }

      firstName = resolveGreetingName({
        profileName,
        metaName: (user?.user_metadata?.full_name as string | undefined) ?? null,
        givenName: (user?.user_metadata?.given_name as string | undefined) ?? null,
        email: user?.email ?? null,
      });
    } catch {
      firstName = 'there';
    }
  }

  return (
    <Section variant="transparent" padding={0}>
      <WelcomeOnboarding firstName={firstName} />
    </Section>
  );
}
