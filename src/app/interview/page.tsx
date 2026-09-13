import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {demoUserId, listCvsForUser} from '@/lib/store';
import {loadPracticeMemory} from '@/lib/interview/practice-memory';
import {WhoAreYouForm} from '@/components/WhoAreYouForm';

export default async function InterviewPage() {
  let savedCv: {id: string; file_name: string; created_at: string} | null =
    null;
  let practiceMemory: {overall: number; focus: string[]} | null = null;

  try {
    let userId: string | null = null;
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: {user},
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } else {
      userId = demoUserId();
    }

    if (userId) {
      const latest = (await listCvsForUser(userId))[0];
      if (latest) {
        savedCv = {
          id: latest.id,
          file_name: latest.file_name,
          created_at: latest.created_at,
        };
      }
      const memory = await loadPracticeMemory(userId);
      if (memory) {
        practiceMemory = {
          overall: memory.overall,
          focus: memory.focus,
        };
      }
    }
  } catch {
    // Keep any CV / memory already loaded.
  }

  return <WhoAreYouForm savedCv={savedCv} practiceMemory={practiceMemory} />;
}
