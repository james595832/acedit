import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Section} from '@astryxdesign/core/Section';
import {FeaturePaused} from '@/components/FeaturePaused';
import {WhiteboardSession} from '@/components/WhiteboardSession';
import {isFeatureEnabled} from '@/lib/feature-flags';
import {getWhiteboardChallenge} from '@/lib/whiteboard/challenges';

type WhiteboardChallengePageProps = {
  params: Promise<{challengeId: string}>;
};

export default async function WhiteboardChallengePage({
  params,
}: WhiteboardChallengePageProps) {
  if (!isFeatureEnabled('whiteboard')) {
    return (
      <>
        <nav className="aced-crumb" aria-label="Breadcrumb">
          <Link href="/studio">← Home</Link>
        </nav>
        <FeaturePaused
          title="Whiteboard challenges"
          lead="Timed design prompts and clarifying questions will return after we lock interview practice."
          roadmapHash="#september-2026"
        />
      </>
    );
  }

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
