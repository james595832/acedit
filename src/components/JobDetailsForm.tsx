'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {FileInput} from '@astryxdesign/core/FileInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Banner} from '@astryxdesign/core/Banner';
import {
  clearCreateDraft,
  readCreateDraft,
  type CreateInterviewDraft,
} from '@/lib/interview/create-draft';
import {INTERVIEW_TRACKS} from '@/lib/interview/tracks';

const JD_ACCEPT =
  'application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';

function fileFromValue(next: File | File[] | null): File | null {
  return next instanceof File ? next : null;
}

function companyHintFromUrl(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const host = new URL(withProtocol).hostname.replace(/^www\./i, '');
    const label = host.split('.')[0];
    if (!label) return undefined;
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return undefined;
  }
}

export function JobDetailsForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<CreateInterviewDraft | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [jdId, setJdId] = useState<string | null>(null);
  const [jdRole, setJdRole] = useState<string | null>(null);
  const [isJdLoading, setIsJdLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = readCreateDraft();
    if (!next?.cv_id && !next?.target_track_id) {
      router.replace('/interview');
      return;
    }
    setDraft(next);
  }, [router]);

  async function analyzeJdIfNeeded(): Promise<string | undefined> {
    if (jdId) return jdId;
    if (!jdFile && !jdText.trim()) return undefined;

    setIsJdLoading(true);
    try {
      const form = new FormData();
      if (jdFile) form.append('file', jdFile);
      if (jdText.trim()) form.append('text', jdText.trim());
      if (companyUrl.trim()) form.append('company_url', companyUrl.trim());
      const res = await fetch('/api/jd/upload', {method: 'POST', body: form});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'JD upload failed');
      setJdId(data.job_description_id as string);
      setJdRole((data.role_title as string | null) ?? null);
      return data.job_description_id as string;
    } finally {
      setIsJdLoading(false);
    }
  }

  async function handleContinue() {
    if (!draft) return;
    setIsLoading(true);
    setError(null);
    try {
      const jobDescriptionId = await analyzeJdIfNeeded();

      if (!jobDescriptionId && !draft.target_track_id && !draft.cv_id) {
        throw new Error('Add a job description, or go back and choose a role.');
      }

      // Role-only path needs a track; CV + JD needs neither track.
      if (!jobDescriptionId && !draft.target_track_id) {
        throw new Error(
          'Add a job description, or go back and choose a role to simulate.',
        );
      }

      const startRes = await fetch('/api/interview/start', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          cv_id: draft.cv_id,
          job_description_id: jobDescriptionId,
          target_track_id: jobDescriptionId
            ? undefined
            : draft.target_track_id,
          interview_type: 'practice',
          company_url: companyUrl.trim() || undefined,
          company: companyHintFromUrl(companyUrl),
        }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) {
        throw new Error(startData.error ?? 'Could not start interview');
      }
      clearCreateDraft();
      router.push(`/interview/start?session_id=${startData.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  const trackLabel = draft?.target_track_id
    ? INTERVIEW_TRACKS.find((t) => t.id === draft.target_track_id)?.label
    : null;

  if (!draft) {
    return (
      <Text as="p" color="secondary">
        Loading…
      </Text>
    );
  }

  return (
    <VStack gap={6} className="aced-flow">
      {error ? (
        <Banner status="error" title="Couldn’t continue" description={error} />
      ) : null}

      <header className="aced-flow__intro">
        <Heading level={1}>Tell us about the Job?</Heading>
        <Text as="p" type="large">
          Provide us with information about the role as this will make the
          interview much more realistic in terms of the questions you’ll be
          asked and ranked.
        </Text>
        {trackLabel || draft.cv_file_name ? (
          <Text as="p" color="secondary" type="supporting">
            {draft.cv_file_name ? `CV: ${draft.cv_file_name}` : null}
            {draft.cv_file_name && trackLabel ? ' · ' : null}
            {trackLabel ? `Role: ${trackLabel}` : null}
            {' · '}
            Optional on this step — skip if you’re simulating from the role
            alone.
          </Text>
        ) : null}
      </header>

      <section className="aced-flow__block" aria-labelledby="aced-job-upload">
        <Heading level={2} id="aced-job-upload">
          Upload a job description
        </Heading>
        <FileInput
          label="Upload a job description"
          isLabelHidden
          description="Upload a job description in either PDF or word format"
          accept={JD_ACCEPT}
          maxSize={10 * 1024 * 1024}
          mode={jdFile ? 'input' : 'dropzone'}
          value={jdFile}
          onChange={(next) => {
            setJdFile(fileFromValue(next));
            setJdId(null);
            setJdRole(null);
          }}
          isOptional
          isLoading={isJdLoading}
          placeholder="Upload a job description in either PDF or word format"
        />
      </section>

      <Text as="p" className="aced-flow__or">
        Or
      </Text>

      <section className="aced-flow__block" aria-labelledby="aced-job-paste">
        <Heading level={2} id="aced-job-paste" className="aced-sr-only">
          Paste job description
        </Heading>
        <TextArea
          label="Paste a job description"
          isLabelHidden
          value={jdText}
          onChange={(next) => {
            setJdText(next);
            setJdId(null);
            setJdRole(null);
          }}
          isOptional
          rows={5}
          placeholder="Paste a job description here..."
        />
      </section>

      <section className="aced-flow__block" aria-labelledby="aced-job-url">
        <Heading level={2} id="aced-job-url">
          Finally add a company URL
        </Heading>
        <Text as="p">
          We use this to pull information on the company to again help us
          simulate a more realistic interview
        </Text>
        <TextInput
          label="Company URL"
          isLabelHidden
          value={companyUrl}
          onChange={setCompanyUrl}
          isOptional
          placeholder="Enter a URL for the company you are applying to"
        />
      </section>

      {jdRole ? (
        <Banner
          status="success"
          title={`Target role: ${jdRole}`}
          description="Questions will lean toward this role."
        />
      ) : null}

      <div className="aced-flow__actions">
        <Button
          label="Continue"
          variant="primary"
          isLoading={isLoading || isJdLoading}
          clickAction={() => {
            void handleContinue();
          }}
        />
        <Button
          label="Back"
          variant="ghost"
          isDisabled={isLoading}
          clickAction={() => router.push('/interview')}
        />
      </div>
    </VStack>
  );
}
