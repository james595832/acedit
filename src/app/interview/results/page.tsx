import {BackLink} from '@/components/BackLink';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Section} from '@astryxdesign/core/Section';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {getAuthUser} from '@/lib/supabase/user';
import {demoUserId, listSessions} from '@/lib/store';
import {historyTilesForSessions} from '@/lib/interview/history-tiles';
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
      userId = (await getAuthUser())?.id ?? null;
    } else {
      userId = demoUserId();
    }
    if (userId) sessions = await listSessions(userId);
  } catch {
    sessions = [];
  }

  const historyRows = await historyTilesForSessions(sessions, userId);

  return (
    <Section variant="transparent" padding={4}>
      <VStack gap={5}>
        <Text as="p" color="secondary">
          <BackLink href="/studio">Interviews</BackLink>
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
