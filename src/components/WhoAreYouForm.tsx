'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Button} from '@astryxdesign/core/Button';
import {VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Banner} from '@astryxdesign/core/Banner';
import {Selector} from '@astryxdesign/core/Selector';
import {INTERVIEW_TRACKS} from '@/lib/interview/tracks';
import {writeCreateDraft} from '@/lib/interview/create-draft';

const TRACK_OPTIONS = INTERVIEW_TRACKS.map((track) => ({
  value: track.id,
  label: track.label,
}));

const CV_ACCEPT =
  'application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx';

function fileFromValue(next: File | File[] | null): File | null {
  return next instanceof File ? next : null;
}

export function WhoAreYouForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [cvId, setCvId] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [targetTrackId, setTargetTrackId] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadCv(selected: File) {
    setIsAnalyzing(true);
    setError(null);
    setCvId(null);
    try {
      const form = new FormData();
      form.append('file', selected);
      const res = await fetch('/api/cv/upload', {method: 'POST', body: form});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setCvId(data.cv_id as string);
      setCvFileName(selected.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleContinue() {
    if (!cvId && !targetTrackId) {
      setError('Choose a role, or upload a CV — either path works.');
      return;
    }
    writeCreateDraft({
      cv_id: cvId ?? undefined,
      target_track_id: targetTrackId || undefined,
      cv_file_name: cvFileName ?? undefined,
    });
    router.push('/interview/job');
  }

  return (
    <VStack gap={6} className="aced-flow">
      {error ? (
        <Banner status="error" title="Couldn’t continue" description={error} />
      ) : null}

      <header className="aced-flow__intro">
        <Heading level={1}>Tell us who you are?</Heading>
        <Text as="p" type="large">
          You can choose a generic role and simulate an interview or you can
          upload a CV and get questions related to the actual job you are going
          for.
        </Text>
      </header>

      <section className="aced-flow__block" aria-labelledby="aced-who-role">
        <Heading level={2} id="aced-who-role">
          Choose a role
        </Heading>
        <Selector
          label="Choose a role"
          isLabelHidden
          description="Pick a role that is closest to the job you are going for"
          placeholder="Pick a role that is closest to the job you are going for"
          options={TRACK_OPTIONS}
          value={targetTrackId || undefined}
          onChange={(next) => {
            setTargetTrackId(next);
            setError(null);
          }}
        />
      </section>

      <Text as="p" className="aced-flow__or">
        Or
      </Text>

      <section className="aced-flow__block" aria-labelledby="aced-who-cv">
        <Heading level={2} id="aced-who-cv" className="aced-sr-only">
          Upload a CV
        </Heading>
        <FileInput
          label="Upload a CV"
          description="Upload a CV in either PDF or word format"
          accept={CV_ACCEPT}
          maxSize={10 * 1024 * 1024}
          mode={file ? 'input' : 'dropzone'}
          value={file}
          onChange={(next) => {
            const selected = fileFromValue(next);
            setFile(selected);
            setCvId(null);
            setCvFileName(null);
            if (!selected) setError(null);
          }}
          changeAction={async (next) => {
            const selected = fileFromValue(next);
            if (selected) await uploadCv(selected);
          }}
          isOptional
          isLoading={isAnalyzing}
          placeholder="Upload a CV in either PDF or word format"
        />
        {cvId ? (
          <Banner
            status="success"
            title="CV ready"
            description={cvFileName ?? 'We’ll use this for personalised questions.'}
          />
        ) : null}
      </section>

      <div className="aced-flow__actions">
        <Button
          label="Continue"
          variant="primary"
          isLoading={isAnalyzing}
          isDisabled={!cvId && !targetTrackId}
          clickAction={handleContinue}
        />
      </div>
    </VStack>
  );
}
