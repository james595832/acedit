import {MarketingLanding} from '@/components/MarketingLanding';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {createClient} from '@/lib/supabase/server';

export default async function HomePage() {
  let userEmail: string | null = null;

  if (isSupabaseConfigured()) {
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

  return <MarketingLanding userEmail={userEmail} />;
}
