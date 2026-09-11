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
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {Section} from '@astryxdesign/core/Section';
import {INTERVIEW_TRACKS} from '@/lib/interview/tracks';
import {writeCreateDraft} from '@/lib/interview/create-draft';
import {FIGMA_COPY} from '@/lib/interview/figma-copy';

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
  const copy = FIGMA_COPY.who;
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
    <Section variant="transparent" padding={0}>
      <VStack gap={5}>
        {error ? (
          <Banner status="error" title="Couldn’t continue" description={error} />
        ) : null}

        <VStack gap={2}>
          <Heading level={1}>{copy.title}</Heading>
          <Text as="p" type="large" color="secondary">
            {copy.lead}
          </Text>
        </VStack>

        <FormLayout direction="vertical">
          <Selector
            label={copy.roleLabel}
            description={copy.rolePlaceholder}
            placeholder={copy.rolePlaceholder}
            options={TRACK_OPTIONS}
            value={targetTrackId || undefined}
            onChange={(next) => {
              setTargetTrackId(next);
              setError(null);
            }}
          />
        </FormLayout>

        <Heading level={2}>{copy.or}</Heading>

        <FormLayout direction="vertical">
          <FileInput
            label={copy.cvDropzone}
            isLabelHidden
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
            placeholder={copy.cvDropzone}
          />
        </FormLayout>

        {cvId ? (
          <Banner
            status="success"
            title="CV ready"
            description={cvFileName ?? 'Ready for the next step.'}
          />
        ) : null}

        <Button
          label={copy.continue}
          variant="primary"
          isLoading={isAnalyzing}
          isDisabled={!cvId && !targetTrackId}
          clickAction={handleContinue}
        />
      </VStack>
    </Section>
  );
}
