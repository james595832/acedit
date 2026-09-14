import {isSupabaseConfigured} from '@/lib/supabase/config';
import {getAuthUser} from '@/lib/supabase/user';
import {demoUserId, listCvsForUser} from '@/lib/store';
import {loadPracticeMemory} from '@/lib/interview/practice-memory';
import {WhoAreYouForm} from '@/components/WhoAreYouForm';

export default async function InterviewPage() {
  let savedCv: {id: string; file_name: string; created_at: string} | null =
    null;
  let practiceMemory: {overall: number; focus: string[]} | null = null;

  try {
    const userId = isSupabaseConfigured()
      ? (await getAuthUser())?.id ?? null
      : demoUserId();

    if (userId) {
      const [latestCv, memory] = await Promise.all([
        listCvsForUser(userId).then((rows) => rows[0] ?? null),
        loadPracticeMemory(userId),
      ]);
      if (latestCv) {
        savedCv = {
          id: latestCv.id,
          file_name: latestCv.file_name,
          created_at: latestCv.created_at,
        };
      }
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
