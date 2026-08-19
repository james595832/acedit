'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {FileInput} from '@astryxdesign/core/FileInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Button} from '@astryxdesign/core/Button';
import {VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Banner} from '@astryxdesign/core/Banner';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {CVAtsReport} from '@/components/CVAtsReport';
import {CVWritingReport} from '@/components/CVWritingReport';
import type {AtsAuditResult} from '@/lib/cv-ats';
import type {WritingAuditResult} from '@/lib/cv-writing-audit';

const CV_ACCEPT =
  'application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx';

type CvPreview = {
  cv_id: string;
  skills: string[];
  experience_years: number | null;
  projects: string[];
  companies: string[];
  roles: string[];
  text_extracted: boolean;
  ats: AtsAuditResult;
  writing: WritingAuditResult;
};

type JdPreview = {
  job_description_id: string;
  role_title: string | null;
  company_name: string | null;
  requirements: string[];
  keywords: string[];
  source_type: string;
};

function fileFromValue(next: File | File[] | null): File | null {
  return next instanceof File ? next : null;
}

export function CVUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isJdLoading, setIsJdLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CvPreview | null>(null);
  const [jdPreview, setJdPreview] = useState<JdPreview | null>(null);
  const [jdOpen, setJdOpen] = useState(false);

  async function uploadCv(selected: File) {
    setIsAnalyzing(true);
    setError(null);
    setPreview(null);
    try {
      const form = new FormData();
      form.append('file', selected);
      const res = await fetch('/api/cv/upload', {method: 'POST', body: form});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setPreview({
        cv_id: data.cv_id,
        skills: data.skills ?? [],
        experience_years: data.experience_years ?? null,
        projects: data.projects ?? [],
        companies: data.companies ?? [],
        roles: data.roles ?? [],
        text_extracted: Boolean(data.text_extracted),
        ats: data.ats as AtsAuditResult,
        writing: data.writing as WritingAuditResult,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleAnalyzeJd() {
    if (!jdFile && !jdText.trim()) {
      setError('Upload a JD screenshot/PDF or paste the job description text.');
      return;
    }
    setIsJdLoading(true);
    setError(null);
    try {
      const form = new FormData();
      if (jdFile) form.append('file', jdFile);
      if (jdText.trim()) form.append('text', jdText.trim());
      const res = await fetch('/api/jd/upload', {method: 'POST', body: form});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'JD upload failed');
      setJdPreview({
        job_description_id: data.job_description_id,
        role_title: data.role_title,
        company_name: data.company_name,
        requirements: data.requirements ?? [],
        keywords: data.keywords ?? [],
        source_type: data.source_type,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsJdLoading(false);
    }
  }

  async function handleStart() {
    if (!preview?.cv_id) {
      setError('Add your CV first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const startRes = await fetch('/api/interview/start', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          cv_id: preview.cv_id,
          job_description_id: jdPreview?.job_description_id,
          interview_type: 'practice',
        }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) {
        throw new Error(startData.error ?? 'Could not start interview');
      }
      router.push(`/interview/start?session_id=${startData.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  const readyCopy = preview?.text_extracted
    ? preview.skills.length
      ? `Read your CV · ${preview.skills.slice(0, 5).join(', ')}`
      : 'Read your CV and ready for a full interview.'
    : 'We couldn’t read enough text from this file. Upload the Word .docx instead of a PDF export — we read that more reliably.';

  return (
    <VStack gap={5} className="aced-prep">
      {error ? (
        <Banner status="error" title="Couldn’t continue" description={error} />
      ) : null}

      <section className="aced-prep__block" aria-labelledby="aced-prep-cv">
        <Heading level={2} id="aced-prep-cv">
          Your CV
        </Heading>
        <Text as="p" color="secondary">
          PDF or Word (.docx). We read it, then ask ten spoken questions: the
          classics first, then five from your actual work.
        </Text>
        <FileInput
          label="Design CV"
          description="PDF or .docx · required · max 10MB"
          accept={CV_ACCEPT}
          maxSize={10 * 1024 * 1024}
          mode={file ? 'input' : 'dropzone'}
          value={file}
          onChange={(next) => {
            const selected = fileFromValue(next);
            setFile(selected);
            setPreview(null);
            if (!selected) setError(null);
          }}
          changeAction={async (next) => {
            const selected = fileFromValue(next);
            if (selected) await uploadCv(selected);
          }}
          isRequired
          isLoading={isAnalyzing}
          placeholder="Drop your CV here, or choose a file"
        />
        {preview ? (
          <VStack gap={3}>
            <Banner
              status={preview.text_extracted ? 'success' : 'warning'}
              title={
                preview.text_extracted
                  ? 'CV ready for your interview'
                  : 'Couldn’t read enough text'
              }
              description={readyCopy}
            />

            <div className="aced-cta-bar">
              <div className="aced-cta-bar__copy">
                <Text type="label">
                  {jdPreview
                    ? 'Ready — CV and role set'
                    : 'Ready — enter the interview room'}
                </Text>
                <Text type="supporting" color="secondary" as="p">
                  About an hour. Ten questions out loud. Mic on.
                </Text>
              </div>
              <Button
                label="Enter interview"
                variant="primary"
                isLoading={isLoading}
                clickAction={handleStart}
              />
            </div>

            {preview.ats || preview.writing ? (
              <Collapsible
                defaultIsOpen={false}
                trigger={<Text type="label">CV health check</Text>}
              >
                <VStack gap={3}>
                  {preview.ats ? <CVAtsReport audit={preview.ats} /> : null}
                  {preview.writing ? (
                    <CVWritingReport audit={preview.writing} />
                  ) : null}
                </VStack>
              </Collapsible>
            ) : null}
          </VStack>
        ) : null}
      </section>

      {preview ? (
        <section className="aced-prep__block" aria-labelledby="aced-prep-jd">
          <button
            type="button"
            className="aced-prep__toggle"
            aria-expanded={jdOpen}
            onClick={() => setJdOpen((v) => !v)}
          >
            <span id="aced-prep-jd">
              {jdPreview
                ? `Role added${jdPreview.role_title ? `: ${jdPreview.role_title}` : ''}`
                : 'Add a job description (optional)'}
            </span>
            <span aria-hidden="true">{jdOpen ? '−' : '+'}</span>
          </button>

          {jdOpen ? (
            <VStack gap={3}>
              <Text as="p" color="secondary">
                Sharpens questions to a target role. Skip if you just want to
                rehearse.
              </Text>
              <FileInput
                label="Job description image or PDF"
                description="PNG, JPG, WEBP, or PDF"
                accept="image/png,image/jpeg,image/webp,application/pdf,.png,.jpg,.jpeg,.webp,.pdf"
                maxSize={10 * 1024 * 1024}
                mode={jdFile ? 'input' : 'dropzone'}
                value={jdFile}
                onChange={(next) => {
                  setJdFile(fileFromValue(next));
                  setJdPreview(null);
                }}
                isOptional
                isLoading={isJdLoading}
                placeholder="Drop JD screenshot or PDF"
              />
              <TextArea
                label="Or paste JD text"
                value={jdText}
                onChange={setJdText}
                isOptional
                rows={4}
                placeholder="Paste the role summary and requirements…"
              />
              <Button
                label="Add role"
                variant="secondary"
                isLoading={isJdLoading}
                isDisabled={!jdFile && !jdText.trim()}
                clickAction={handleAnalyzeJd}
              />
              {jdPreview ? (
                <Banner
                  status="success"
                  title={
                    jdPreview.role_title
                      ? `Target role: ${jdPreview.role_title}`
                      : 'Job description captured'
                  }
                  description={
                    jdPreview.company_name
                      ? `${jdPreview.company_name} · questions will lean toward this role`
                      : 'Questions will lean toward this role'
                  }
                />
              ) : null}
            </VStack>
          ) : null}
        </section>
      ) : null}
    </VStack>
  );
}
