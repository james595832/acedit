import {Section} from '@astryxdesign/core/Section';
import {WhiteboardHub} from '@/components/WhiteboardHub';
import {listWhiteboardChallenges} from '@/lib/whiteboard/challenges';

export default function WhiteboardIndexPage() {
  const challenges = listWhiteboardChallenges();

  return (
    <>
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <p className="aced-masthead__kicker">Practice · Whiteboard</p>
          <h1>Whiteboard challenges</h1>
          <p className="aced-masthead__lead">
            Timed design prompts, a marker canvas, and limited AI clarifying
            questions — practice like a real onsite, then review your boards.
          </p>
        </div>
      </header>

      <Section variant="transparent" padding={0}>
        <WhiteboardHub challenges={challenges} />
      </Section>
    </>
  );
}
