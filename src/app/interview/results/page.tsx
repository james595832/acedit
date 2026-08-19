import Link from 'next/link';
import {VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Section} from '@astryxdesign/core/Section';
import {List, ListItem} from '@astryxdesign/core/List';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {demoUserId, listSessions} from '@/lib/store';
import {daysAgoLabel} from '@/lib/greeting';
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
    if (userId) sessions = await listSessions(userId);
  } catch {
    sessions = [];
  }

  return (
    <div className="aced-debrief">
      <nav className="aced-crumb" aria-label="Breadcrumb">
        <Link href="/studio">← Home</Link>
      </nav>

      <Section variant="transparent" padding={0}>
        <VStack gap={5}>
          <header className="aced-debrief__head">
            <Heading level={1}>Your interview results</Heading>
            <Text as="p" color="secondary" className="aced-debrief__lead">
              {sessions.length
                ? 'Open a past interview to review scores and feedback.'
                : 'Finish an interview to see scores and coaching notes here.'}
            </Text>
          </header>

          {sessions.length === 0 ? (
            <EmptyState
              headingLevel={2}
              title="No interviews yet"
              description="Start with your CV, answer ten questions out loud, then come back here for the debrief."
              actions={
                <Link className="aced-home__primary" href="/interview">
                  Start interview
                </Link>
              }
            />
          ) : (
            <>
              <List
                density="balanced"
                hasDividers
                header={
                  <Heading level={2} id="aced-results-list">
                    Past interviews
                  </Heading>
                }
              >
                {sessions.map((session, index) => {
                  const score =
                    session.overall_score === null ||
                    session.overall_score === undefined
                      ? null
                      : Math.round(Number(session.overall_score));
                  return (
                    <ListItem
                      key={session.id}
                      href={`/interview/results?session_id=${session.id}`}
                      label={
                        score !== null
                          ? `Score ${score} / 100`
                          : index === 0
                            ? 'Latest interview'
                            : 'Interview'
                      }
                      description={daysAgoLabel(session.created_at)}
                      endContent={
                        <Text type="supporting" color="secondary">
                          View
                        </Text>
                      }
                    />
                  );
                })}
              </List>

              <div className="aced-debrief__cta">
                <Link className="aced-home__primary" href="/interview">
                  Start another interview
                </Link>
              </div>
            </>
          )}
        </VStack>
      </Section>
    </div>
  );
}
