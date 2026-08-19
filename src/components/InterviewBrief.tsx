'use client';

import Link from 'next/link';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Avatar, AvatarStatusDot} from '@astryxdesign/core/Avatar';
import {
  INTERVIEWER_NAME,
  INTERVIEWER_TITLE,
  INTERVIEW_DURATION_LABEL,
} from '@/lib/interview/host';

type InterviewBriefProps = {
  firstName: string;
  position: string;
  questionCount: number;
  onReady: () => void;
};

export function InterviewBrief({
  firstName,
  position,
  questionCount,
  onReady,
}: InterviewBriefProps) {
  const named = firstName !== 'there';

  return (
    <article className="aced-brief">
      <header>
        <HStack gap={4} align="center">
          <Avatar
            name={INTERVIEWER_NAME}
            size="lg"
            status={<AvatarStatusDot variant="success" label="In the room" />}
          />
          <VStack gap={0}>
            <Text type="label" as="p">
              {INTERVIEWER_NAME}
            </Text>
            <Text type="supporting" color="secondary" as="p">
              {INTERVIEWER_TITLE}
            </Text>
          </VStack>
        </HStack>
      </header>

      <Heading level={1}>
        {named ? (
          <>
            Welcome to your interview, <em>{firstName}</em>.
          </>
        ) : (
          'Welcome to your interview.'
        )}
      </Heading>

      <VStack gap={5} className="aced-brief__copy">
        <Text as="p" type="large" className="aced-brief__lead">
          I’m {INTERVIEWER_NAME}, your AI interviewer. You have nothing to be
          concerned about — I’m sure you’ll ace this.
        </Text>
        <Text as="p" color="secondary" className="aced-brief__body">
          This interview will run for {INTERVIEW_DURATION_LABEL}. I’ll ask a
          series of questions and find out your suitability for{' '}
          <strong>{position}</strong>.
        </Text>
      </VStack>

      <HStack gap={3} align="center" wrap="wrap" className="aced-brief__actions">
        <Button
          label="I’m ready"
          variant="primary"
          size="lg"
          clickAction={onReady}
          isDisabled={questionCount === 0}
        />
        <Link className="aced-brief__back" href="/interview">
          Not yet
        </Link>
      </HStack>

      <Text type="supporting" color="secondary" as="p" className="aced-brief__meta">
        {INTERVIEW_DURATION_LABEL}
        {' · '}
        {questionCount} questions
        {' · '}
        Spoken
      </Text>
    </article>
  );
}
