'use client';

import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {Avatar, AvatarStatusDot} from '@astryxdesign/core/Avatar';
import {BackLink} from '@/components/BackLink';
import {
  INTERVIEWER_NAME,
  INTERVIEWER_TITLE,
  INTERVIEW_DURATION_LABEL,
} from '@/lib/interview/host';
import {roundTitle, type PersonaVoice} from '@/lib/interview/personas';

type InterviewBriefProps = {
  firstName: string;
  position: string;
  roleTitle?: string | null;
  companyName?: string | null;
  tailoredToJd?: boolean;
  questionCount: number;
  onReady: () => void;
  practiceFocus?: string[];
  lastScore?: number | null;
  stageNumber?: number;
  durationLabel?: string;
  voices?: PersonaVoice[];
  roundHeading?: string;
};

export function InterviewBrief({
  firstName,
  position,
  roleTitle = null,
  companyName = null,
  tailoredToJd = false,
  questionCount,
  onReady,
  practiceFocus = [],
  lastScore = null,
  stageNumber = 1,
  durationLabel = INTERVIEW_DURATION_LABEL,
  voices = [],
  roundHeading,
}: InterviewBriefProps) {
  const named = firstName !== 'there';
  const room = voices.length > 0 ? voices : [{
    persona: 'hirer' as const,
    name: INTERVIEWER_NAME,
    title: INTERVIEWER_TITLE,
  }];
  const heading = roundHeading ?? roundTitle(stageNumber === 2 ? 2 : stageNumber === 3 ? 3 : 1);
  const lead =
    stageNumber === 2
      ? 'Three people, one room. Engineering will ask if it can ship. Product will ask what you would cut. Senior design will ask what you would reject.'
      : stageNumber === 3
        ? `${room[0]?.name} is short and skeptical. One decision. One risk. No TED talk.`
        : `I’m ${INTERVIEWER_NAME}, your AI interviewer. You have nothing to be concerned about — I’m sure you’ll ace this.`;

  return (
    <article className="aced-brief">
      <header>
        <HStack gap={4} align="center" wrap="wrap">
          {room.map((voice) => (
            <HStack key={voice.persona} gap={3} align="center">
              <Avatar
                name={voice.name}
                size="lg"
                status={<AvatarStatusDot variant="success" label="In the room" />}
              />
              <VStack gap={0}>
                <Text type="label" as="p">
                  {voice.name}
                </Text>
                <Text type="supporting" color="secondary" as="p">
                  {voice.title}
                </Text>
              </VStack>
            </HStack>
          ))}
        </HStack>
      </header>

      <Heading level={1}>
        {named ? (
          <>
            {heading}, <em>{firstName}</em>.
          </>
        ) : (
          heading
        )}
      </Heading>

      <VStack gap={5} className="aced-brief__copy">
        <Text as="p" type="large" className="aced-brief__lead">
          {lead}
        </Text>
        <Text as="p" color="secondary" className="aced-brief__body">
          This interview will run for {durationLabel}. The room will ask a
          series of questions and find out your suitability for{' '}
          <strong>{position}</strong>.
        </Text>
        {tailoredToJd && (roleTitle || companyName) ? (
          <Banner
            status="success"
            title={
              roleTitle && companyName
                ? `You’re applying for ${roleTitle} at ${companyName}`
                : roleTitle
                  ? `You’re applying for ${roleTitle}`
                  : `You’re applying at ${companyName}`
            }
            description={
              companyName && roleTitle
                ? 'I read the job description, looked at the company, and compared it with your CV — including where the spec is heavier than your file.'
                : 'I used the job description you gave me to write these questions.'
            }
          />
        ) : null}
        {practiceFocus.length > 0 ? (
          <Banner
            status="info"
            title="I’ll press last time’s weak spots"
            description={
              lastScore !== null
                ? `Last interview scored ${lastScore}/100. ${practiceFocus.slice(0, 2).join(' ')}`
                : practiceFocus.slice(0, 2).join(' ')
            }
          />
        ) : null}
      </VStack>

      <HStack gap={3} align="center" wrap="wrap" className="aced-brief__actions">
        {questionCount === 0 ? (
          <Banner
            status="error"
            title="No questions in this room"
            description="Something went wrong building the interview. Go back and start again."
          />
        ) : null}
        <Button
          label="I’m ready"
          variant="primary"
          size="lg"
          clickAction={onReady}
          isDisabled={questionCount === 0}
        />
        <BackLink href="/interview" className="aced-brief__back">
          {questionCount === 0 ? 'Start again' : 'Not yet'}
        </BackLink>
      </HStack>

      <Text type="supporting" color="secondary" as="p" className="aced-brief__meta">
        {heading}
        {' · '}
        {durationLabel}
        {' · '}
        {questionCount} questions
        {' · '}
        Spoken
      </Text>
    </article>
  );
}
