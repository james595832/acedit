import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Section} from '@astryxdesign/core/Section';
import {WhiteboardSession} from '@/components/WhiteboardSession';
import {getWhiteboardChallenge} from '@/lib/whiteboard/challenges';

type WhiteboardChallengePageProps = {
  params: Promise<{challengeId: string}>;
};

export default async function WhiteboardChallengePage({
  params,
}: WhiteboardChallengePageProps) {
  const {challengeId} = await params;
  const challenge = getWhiteboardChallenge(challengeId);
  if (!challenge) notFound();

  return (
    <Section variant="transparent" padding={0}>
      <p className="aced-wb__back">
        <Link href="/whiteboard">← All challenges</Link>
      </p>
      <WhiteboardSession challenge={challenge} />
    </Section>
  );
}
