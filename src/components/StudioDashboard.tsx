'use client';

import {useEffect, useState} from 'react';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Section} from '@astryxdesign/core/Section';
import {Banner} from '@astryxdesign/core/Banner';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {WelcomeOnboarding} from '@/components/WelcomeOnboarding';
import {
  InterviewHistoryList,
  type InterviewHistoryRow,
} from '@/components/InterviewHistoryList';
import {CreateInterviewButton} from '@/components/CreateInterviewButton';
import {hasSeenWelcome} from '@/lib/interview/create-draft';
import {FIGMA_COPY} from '@/lib/interview/figma-copy';

export function StudioDashboard({
  firstName,
  billingBanner,
  sessions,
}: {
  firstName: string;
  billingBanner: string | null;
  sessions: InterviewHistoryRow[];
}) {
  const copy = FIGMA_COPY.interviews;
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    setShowWelcome(sessions.length === 0 && !hasSeenWelcome());
  }, [sessions.length]);

  if (showWelcome) {
    return <WelcomeOnboarding firstName={firstName} />;
  }

  return (
    <Section variant="transparent" padding={4}>
      <VStack gap={6}>
        <HStack gap={4} align="start" justify="between" wrap="wrap">
          <VStack gap={2}>
            <Heading level={1}>{copy.title}</Heading>
            <Text as="p" type="large" color="secondary">
              {copy.lead}
            </Text>
          </VStack>
          <CreateInterviewButton label={copy.create} />
        </HStack>

        {billingBanner ? (
          <Banner status="success" title={billingBanner} />
        ) : null}

        {sessions.length === 0 ? (
          <EmptyState
            headingLevel={2}
            title={copy.emptyTitle}
            description={copy.emptyDescription}
            actions={<CreateInterviewButton label={copy.create} />}
          />
        ) : (
          <InterviewHistoryList sessions={sessions} />
        )}
      </VStack>
    </Section>
  );
}
