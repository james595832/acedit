'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Button} from '@astryxdesign/core/Button';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Banner} from '@astryxdesign/core/Banner';
import {Selector} from '@astryxdesign/core/Selector';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {Section} from '@astryxdesign/core/Section';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {
  INTERVIEW_TRACKS,
  type DesignProcessStance,
} from '@/lib/interview/tracks';
import {writeCreateDraft} from '@/lib/interview/create-draft';
import {FIGMA_COPY} from '@/lib/interview/figma-copy';
import {uploadWithProgress} from '@/lib/upload-with-progress';

const TRACK_OPTIONS = INTERVIEW_TRACKS.map((track) => ({
  value: track.id,
  label: track.label,
}));

const CV_ACCEPT =
  'application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx';

function fileFromValue(next: File | File[] | null): File | null {
  return next instanceof File ? next : null;
}

export type SavedCvOption = {
  id: string;
  file_name: string;
  created_at: string;
};

export type PracticeMemorySummary = {
  overall: number;
  focus: string[];
};

export function WhoAreYouForm({
  savedCv = null,
  practiceMemory = null,
}: {
  savedCv?: SavedCvOption | null;
  practiceMemory?: PracticeMemorySummary | null;
}) {
  const router = useRouter();
  const copy = FIGMA_COPY.who;
  const [cvChoice, setCvChoice] = useState<'saved' | 'upload'>(
    savedCv ? 'saved' : 'upload',
  );
  const [file, setFile] = useState<File | null>(null);
  const [cvId, setCvId] = useState<string | null>(savedCv?.id ?? null);
  const [cvFileName, setCvFileName] = useState<string | null>(
    savedCv?.file_name ?? null,
  );
  const [targetTrackId, setTargetTrackId] = useState('');
  const [processStance, setProcessStance] =
    useState<DesignProcessStance>('classic');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'sending' | 'reading'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  async function uploadCv(selected: File) {
    setIsAnalyzing(true);
    setError(null);
    setCvId(null);
    setUploadPercent(0);
    setUploadPhase('sending');
    try {
      const form = new FormData();
      form.append('file', selected);
      const result = await uploadWithProgress('/api/cv/upload', form, (pct) => {
        setUploadPercent(pct);
        if (pct >= 100) setUploadPhase('reading');
      });
      setUploadPhase('reading');
      if (!result.ok) {
        throw new Error(
          typeof result.data.error === 'string'
            ? result.data.error
            : 'Upload failed',
        );
      }
      setCvId(result.data.cv_id as string);
      setCvFileName(selected.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setFile(null);
    } finally {
      setIsAnalyzing(false);
      setUploadPhase('idle');
      setUploadPercent(0);
    }
  }

  function handleContinue() {
    if (isAnalyzing) {
      setError('Wait for the CV to finish uploading — it is still being read.');
      return;
    }
    if (!cvId && !targetTrackId) {
      setError('Choose a role, use your CV on file, or upload a CV.');
      return;
    }
    writeCreateDraft({
      cv_id: cvId ?? undefined,
      target_track_id: targetTrackId || undefined,
      cv_file_name: cvFileName ?? undefined,
      process_stance: processStance,
    });
    router.push('/interview/job');
  }

  const progressLabel =
    uploadPhase === 'sending'
      ? `Uploading ${file?.name ?? 'your CV'}…`
      : 'Reading your CV. This can take up to a minute.';

  return (
    <Section variant="transparent" padding={4}>
      <VStack gap={5}>
        {error ? (
          <Banner status="error" title="Couldn’t continue" description={error} />
        ) : null}

        {practiceMemory ? (
          <Banner
            status="info"
            title={copy.memoryTitle}
            description={
              practiceMemory.focus[0]
                ? `Last interview scored ${practiceMemory.overall}/100. Practise: ${practiceMemory.focus.slice(0, 2).join(' ')}`
                : `Last interview scored ${practiceMemory.overall}/100. This round will press the weaker answers.`
            }
          />
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
            placeholder="Select a role"
            placement="below"
            options={TRACK_OPTIONS}
            value={targetTrackId || undefined}
            onChange={(next) => {
              setTargetTrackId(next);
              setError(null);
            }}
          />
          <RadioList
            label={copy.processLabel}
            description={copy.processDescription}
            value={processStance}
            onChange={(next) =>
              setProcessStance(next as DesignProcessStance)
            }
          >
            <RadioListItem
              value="classic"
              label={copy.classicLabel}
              description={copy.classicDescription}
            />
            <RadioListItem
              value="prototype_first"
              label={copy.prototypeLabel}
              description={copy.prototypeDescription}
            />
          </RadioList>
        </FormLayout>

        {savedCv ? (
          <FormLayout direction="vertical">
            <RadioList
              label={copy.cvOnFileLabel}
              description={copy.cvOnFileDescription}
              value={cvChoice}
              onChange={(next) => {
                const choice = next as 'saved' | 'upload';
                setCvChoice(choice);
                setError(null);
                if (choice === 'saved') {
                  setFile(null);
                  setCvId(savedCv.id);
                  setCvFileName(savedCv.file_name);
                } else {
                  setCvId(null);
                  setCvFileName(null);
                }
              }}
            >
              <RadioListItem
                value="saved"
                label={copy.cvUseSaved(savedCv.file_name)}
                description={copy.cvUseSavedHint}
              />
              <RadioListItem
                value="upload"
                label={copy.cvUploadNew}
                description={copy.cvUploadNewHint}
              />
            </RadioList>
          </FormLayout>
        ) : (
          <Heading level={2}>{copy.or}</Heading>
        )}

        {!savedCv || cvChoice === 'upload' ? (
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
              isDisabled={isAnalyzing}
              placeholder={copy.cvDropzone}
              status={
                isAnalyzing
                  ? {type: 'warning', message: progressLabel}
                  : undefined
              }
            />
          </FormLayout>
        ) : null}

        {isAnalyzing ? (
          <VStack gap={2}>
            <ProgressBar
              label={progressLabel}
              value={uploadPhase === 'sending' ? uploadPercent : 100}
              max={100}
              hasValueLabel={uploadPhase === 'sending'}
              isIndeterminate={uploadPhase === 'reading'}
              variant="accent"
            />
            <Text as="p" type="supporting" color="secondary">
              {progressLabel}
            </Text>
          </VStack>
        ) : null}

        {cvId && (cvChoice === 'saved' || file) ? (
          <Banner
            status="success"
            title={cvChoice === 'saved' ? 'Using CV on file' : 'CV ready'}
            description={cvFileName ?? 'Ready for the next step.'}
          />
        ) : null}

        <HStack>
          <Button
            label={isAnalyzing ? 'Working on your CV…' : copy.continue}
            variant="primary"
            isLoading={isAnalyzing}
            isDisabled={isAnalyzing || (!cvId && !targetTrackId)}
            clickAction={handleContinue}
          />
        </HStack>
      </VStack>
    </Section>
  );
}
