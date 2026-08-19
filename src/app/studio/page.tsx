import Link from 'next/link';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {Section} from '@astryxdesign/core/Section';
import {Banner} from '@astryxdesign/core/Banner';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {isStripeConfigured} from '@/lib/stripe';
import {syncBillingFromCheckoutSession} from '@/lib/billing/sync';
import {demoUserId, listSessions} from '@/lib/store';
import {daysAgoLabel, resolveGreetingName} from '@/lib/greeting';

type StudioPageProps = {
  searchParams: Promise<{billing?: string; session_id?: string}>;
};

export default async function StudioPage({searchParams}: StudioPageProps) {
  let firstName = 'there';
  let billingBanner: string | null = null;
  let userId: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: {user},
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;

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

      const params = await searchParams;
      if (
        user &&
        params.billing === 'success' &&
        params.session_id &&
        isStripeConfigured()
      ) {
        try {
          await syncBillingFromCheckoutSession(params.session_id, user.id);
          billingBanner = 'Trial started. You’re on Pro. Welcome in!';
        } catch (error) {
          console.error('[studio] billing sync', error);
          billingBanner =
            'Payment received, but membership didn’t sync yet. Open Settings to refresh.';
        }
      } else if (params.billing === 'already_active') {
        billingBanner = 'You’re already on Pro.';
      }
    } catch {
      firstName = 'there';
    }
  }

  let sessions: Awaited<ReturnType<typeof listSessions>> = [];
  try {
    const statsUserId =
      userId ?? (isSupabaseConfigured() ? null : demoUserId());
    sessions = statsUserId ? await listSessions(statsUserId) : [];
  } catch {
    // stats are decorative — never block the page on them
  }

  const hasRuns = sessions.length > 0;
  const latest = sessions[0] ?? null;
  const lastSessionScore =
    latest?.overall_score === null || latest?.overall_score === undefined
      ? null
      : Math.round(Number(latest.overall_score));
  const resultsHref = latest
    ? `/interview/results?session_id=${latest.id}`
    : null;
  const recent = sessions.slice(0, 5);

  return (
    <Section variant="transparent" padding={0}>
      <VStack gap={6} className="aced-home">
        <header className="aced-home__hero">
          <Text type="label" color="secondary" as="p">
            Hi {firstName}
          </Text>
          <Heading level={1} type="display-3">
            {hasRuns
              ? 'Ready for your next interview?'
              : 'You’re here for design interview prep'}
          </Heading>
          <Text as="p" color="secondary" type="large" className="aced-home__lead">
            {hasRuns
              ? 'Same loop as last time: prepare with your CV, sit with Tom for about an hour, then debrief your scores.'
              : 'About an hour. Upload your CV, speak your answers, get clear feedback on what to improve.'}
          </Text>
          {billingBanner ? (
            <Banner status="success" title={billingBanner} />
          ) : null}

          <div className="aced-home__actions">
            <Link className="aced-home__primary" href="/interview">
              {hasRuns ? 'Start interview' : 'Get started'}
            </Link>
            {resultsHref ? (
              <Link className="aced-home__secondary" href={resultsHref}>
                {lastSessionScore !== null
                  ? `Last score · ${lastSessionScore}`
                  : 'Last interview'}
                {latest?.created_at
                  ? ` · ${daysAgoLabel(latest.created_at)}`
                  : ''}
              </Link>
            ) : null}
          </div>
        </header>

        {!hasRuns ? (
          <>
            <List
              density="spacious"
              hasDividers
              listStyle="decimal"
              header={
                <Heading level={2} id="aced-home-how">
                  How an interview works
                </Heading>
              }
            >
              <ListItem
                label="Prepare"
                description="Upload your design CV (PDF or Word). Add a job description if you have a target role."
              />
              <ListItem
                label="Room"
                description="Answer ten questions out loud — five classics, then five from your CV. We transcribe and score each one."
              />
              <ListItem
                label="Debrief"
                description="See what landed, what to fix, then run it again."
              />
            </List>

            <List
              density="spacious"
              hasDividers
              header={
                <Heading level={2} id="aced-home-need">
                  What you need
                </Heading>
              }
            >
              <ListItem label="A quiet spot and a working microphone" />
              <ListItem label="About an hour uninterrupted" />
              <ListItem label="Your design CV as a PDF or Word (.docx)" />
            </List>
          </>
        ) : (
          <>
            <List
              density="spacious"
              hasDividers
              listStyle="decimal"
              header={
                <Heading level={2} id="aced-home-how">
                  Each interview
                </Heading>
              }
            >
              <ListItem
                label="Prepare"
                description="CV ready — optional JD to sharpen the questions."
              />
              <ListItem
                label="Room"
                description="Ten spoken answers. Scored before you move on."
              />
              <ListItem
                label="Debrief"
                description="Overall score and notes on every answer."
              />
            </List>

            <List
              density="balanced"
              hasDividers
              header={
                <Heading level={2} id="aced-home-recent">
                  Recent interviews
                </Heading>
              }
            >
              {recent.map((session, index) => {
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
          </>
        )}
      </VStack>
    </Section>
  );
}
