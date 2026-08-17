import Link from 'next/link';
import {Section} from '@astryxdesign/core/Section';
import {CVUploadForm} from '@/components/CVUploadForm';

export default function InterviewPage() {
  return (
    <>
      <nav className="aced-crumb" aria-label="Breadcrumb">
        <Link href="/studio">← Home</Link>
      </nav>
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <h1>Prepare</h1>
          <p className="aced-masthead__lead">
            Add your CV, then enter the interview. A job description is optional.
          </p>
        </div>
      </header>
      <Section variant="transparent" padding={0}>
        <div className="aced-panel aced-panel--prep">
          <CVUploadForm />
        </div>
      </Section>
    </>
  );
}
