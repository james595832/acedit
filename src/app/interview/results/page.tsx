import Link from 'next/link';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Section} from '@astryxdesign/core/Section';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {
  demoUserId,
  getJobDescription,
  listSessions,
} from '@/lib/store';
import {InterviewHistoryList} from '@/components/InterviewHistoryList';
import {CreateInterviewButton} from '@/components/CreateInterviewButton';
import {ResultsDebrief} from './ResultsDebrief';

type ResultsPageProps = {
  searchParams: Promise<{session_id?: string}>;
};

export default async function ResultsPage({searchParams}: ResultsPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id?.trim() ?? '';

  if (sessionId) {
    return <ResultsDebrief sessionId={sessionId} />;
  }

  let sessions: Awaited<ReturnType<typeof listSessions>> = [];
  let userId: string | null = null;
  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: {user},
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } else {
      userId = demoUserId();
    }
    if (userId) sessions = await listSessions(userId);
  } catch {
    sessions = [];
  }

  const historyRows = await Promise.all(
    sessions.map(async (session) => {
      let role_title: string | null = null;
      let company_name: string | null = null;
      if (session.job_description_id && userId) {
        try {
          const jd = await getJobDescription(
            session.job_description_id,
            userId,
          );
          role_title = jd?.role_title ?? null;
          company_name = jd?.company_name ?? null;
        } catch {
          // decorative
        }
      }
      return {
        id: session.id,
        overall_score: session.overall_score,
        created_at: session.created_at,
        role_title,
        company_name,
      };
    }),
  );

  return (
    <Section variant="transparent" padding={0}>
      <VStack gap={5}>
        <Text as="p" color="secondary">
          <Link href="/studio">← Interviews</Link>
        </Text>

        <HStack gap={4} align="start" justify="between" wrap="wrap">
          <VStack gap={2}>
            <Heading level={1}>Interviews</Heading>
            <Text as="p" type="large" color="secondary">
              We will keep a list of your interviews here for you to review or
              retake
            </Text>
          </VStack>
          <CreateInterviewButton />
        </HStack>

        {historyRows.length === 0 ? (
          <EmptyState
            headingLevel={2}
            title="No interviews yet"
            description="Create your first interview — pick a role or upload a CV, then add a job description if you have one."
            actions={<CreateInterviewButton />}
          />
        ) : (
          <InterviewHistoryList sessions={historyRows} />
        )}
      </VStack>
    </Section>
  );
}
