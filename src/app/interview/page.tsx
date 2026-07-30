import {Section} from '@astryxdesign/core/Section';
import {CVUploadForm} from '@/components/CVUploadForm';

export default function InterviewPage() {
  return (
    <>
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <p className="aced-masthead__kicker">Practice · Prep</p>
          <h1>Practice interview</h1>
          <p className="aced-masthead__lead">
            This is the practice flow: analyse your CV, optionally add a job
            description, then start speaking. Results land after you finish.
          </p>
        </div>
      </header>
      <Section variant="transparent" padding={0}>
        <div className="aced-panel">
          <CVUploadForm />
        </div>
      </Section>
    </>
  );
}
