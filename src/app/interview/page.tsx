import {Section} from '@astryxdesign/core/Section';
import {CVUploadForm} from '@/components/CVUploadForm';

export default function InterviewPage() {
  return (
    <>
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <p className="aced-masthead__kicker">Studio · Prep</p>
          <h1>Practice interview</h1>
          <p className="aced-masthead__lead">
            Three steps: analyse your CV, optionally add a job description, then
            start. We build questions and a strong/weak answer rubric around that
            brief.
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
