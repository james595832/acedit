import Link from 'next/link';
import {Section} from '@astryxdesign/core/Section';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/Layout';
import {CVUploadForm} from '@/components/CVUploadForm';
import {SessionProgress} from '@/components/SessionProgress';

export default function InterviewPage() {
  return (
    <VStack gap={5}>
      <nav className="aced-crumb" aria-label="Breadcrumb">
        <Link href="/studio">← Home</Link>
      </nav>

      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <SessionProgress
            label="Interview"
            current={1}
            total={3}
            status="Prepare"
          />
          <Heading level={1}>Prepare</Heading>
          <Text as="p" color="secondary" type="large" className="aced-masthead__lead">
            Step 1 of 3 — add your CV so Tom can brief you, then run a full
            interview: five classic questions, then five from your work. A job
            description is optional.
          </Text>
        </div>
      </header>

      <Section variant="transparent" padding={0}>
        <div className="aced-panel aced-panel--prep">
          <CVUploadForm />
        </div>
      </Section>
    </VStack>
  );
}
