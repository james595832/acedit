import Link from 'next/link';
import {FeaturePaused} from '@/components/FeaturePaused';
import {isFeatureEnabled} from '@/lib/feature-flags';
import {WhiteboardHub} from '@/components/WhiteboardHub';
import {listWhiteboardChallenges} from '@/lib/whiteboard/challenges';

export default function WhiteboardIndexPage() {
  if (!isFeatureEnabled('whiteboard')) {
    return (
      <>
        <nav className="aced-crumb" aria-label="Breadcrumb">
          <Link href="/studio">← Home</Link>
        </nav>
        <FeaturePaused
          title="Whiteboard challenges"
          lead="Timed design prompts and clarifying questions will return after we lock interview practice."
          roadmapHash="#next"
        />
      </>
    );
  }

  const challenges = listWhiteboardChallenges();

  return (
    <>
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <h1>Whiteboard challenges</h1>
          <p className="aced-masthead__lead">
            Timed prompts. A marker board. Clarifying questions with an
            interviewer who won’t solve it for you.
          </p>
        </div>
      </header>
      <WhiteboardHub challenges={challenges} />
    </>
  );
}
