'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {FileInput} from '@astryxdesign/core/FileInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Button} from '@astryxdesign/core/Button';
import {VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Banner} from '@astryxdesign/core/Banner';
import {Divider} from '@astryxdesign/core/Divider';
import {PrepStepper} from '@/components/PrepStepper';
import {CVAtsReport} from '@/components/CVAtsReport';
import {CVWritingReport} from '@/components/CVWritingReport';
import type {AtsAuditResult} from '@/lib/cv-ats';
import type {WritingAuditResult} from '@/lib/cv-writing-audit';

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

type WhiteboardRecommendation = {
  recommended: boolean;
  reason: string | null;
  matchedTerms: string[];
};

type JdPreview = {
  job_description_id: string;
  role_title: string | null;
  company_name: string | null;
  requirements: string[];
  keywords: string[];
  source_type: string;
  whiteboard_recommendation?: WhiteboardRecommendation;
};

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
  const [whiteboardHint, setWhiteboardHint] =
    useState<WhiteboardRecommendation | null>(null);

  async function handleAnalyzeCv() {
    if (!file) {
      setError('Choose a PDF CV first.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
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
        whiteboard_recommendation: data.whiteboard_recommendation,
      });
      setWhiteboardHint(data.whiteboard_recommendation ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsJdLoading(false);
    }
  }

  async function handleStart() {
    if (!preview?.cv_id) {
      setError('Analyse a CV before starting the interview.');
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
      if (startData.whiteboard_recommendation?.recommended) {
        setWhiteboardHint(startData.whiteboard_recommendation);
      }
      router.push(
        `/interview/start?session_id=${startData.session_id}&question_id=${startData.question_id}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  const cvDone = Boolean(preview);
  const jdDone = Boolean(jdPreview);
  const steps = [
    {
      id: 'cv',
      label: 'Your CV',
      hint: 'Upload and analyse your design CV',
      done: cvDone,
      current: !cvDone,
    },
    {
      id: 'jd',
      label: 'Job description',
      hint: 'Optional. Add a JD to sharpen role-fit scoring',
      done: jdDone,
      current: false,
      optional: true,
    },
    {
      id: 'start',
      label: 'Start practice',
      hint: cvDone
        ? jdDone
          ? 'CV + JD ready. Begin the interview'
          : 'CV ready. Add a JD above, or start now'
        : 'Unlocks after your CV is analysed',
      done: false,
      current: cvDone,
    },
  ];

  return (
    <VStack gap={4}>
      {error ? (
        <Banner status="error" title="Prep error" description={error} />
      ) : null}

      <PrepStepper steps={steps} />

      <header
        className={`aced-section-head${!cvDone ? ' aced-section-head--active' : ''}`}
      >
        <p className="aced-section-head__eyebrow">Step 1 · Required</p>
        <Heading level={3}>Your CV</Heading>
      </header>
      <FileInput
        label="Design CV (PDF)"
        description="We extract text, check ATS readability and writing tone, then personalise interview questions."
        accept="application/pdf,.pdf"
        maxSize={10 * 1024 * 1024}
        mode="dropzone"
        value={file}
        onChange={(next) => {
          setFile(next instanceof File ? next : null);
          setPreview(null);
        }}
        isRequired
        isLoading={isAnalyzing}
        placeholder="Drop your CV here"
      />
      <Button
        label="Analyse CV"
        variant="secondary"
        isLoading={isAnalyzing}
        isDisabled={!file}
        clickAction={handleAnalyzeCv}
      />

      {preview ? (
        <VStack gap={3}>
          {preview.ats ? <CVAtsReport audit={preview.ats} /> : null}
          {preview.writing ? <CVWritingReport audit={preview.writing} /> : null}
          <Banner
            status={preview.text_extracted ? 'success' : 'warning'}
            title={
              preview.text_extracted
                ? 'CV text extracted for practice'
                : 'Little CV text extracted'
            }
            description={`Skills spotted: ${preview.skills.join(', ')}`}
          />
          {preview.projects.length > 0 ? (
            <Text as="p" color="secondary">
              Projects: {preview.projects.slice(0, 3).join(' · ')}
            </Text>
          ) : null}
        </VStack>
      ) : null}

      <Divider />

      <header className="aced-section-head">
        <p className="aced-section-head__eyebrow">Step 2 · Optional</p>
        <Heading level={3}>Target job description</Heading>
      </header>
      <Text as="p" color="secondary">
        Upload a screenshot/image of the JD, a PDF, or paste text. We OCR images
        for free and use requirements to tailor questions and “good answer”
        criteria. You can skip this and still start practice.
      </Text>
      <FileInput
        label="Job description image or PDF"
        description="PNG, JPG, WEBP, or PDF"
        accept="image/png,image/jpeg,image/webp,application/pdf,.png,.jpg,.jpeg,.webp,.pdf"
        maxSize={10 * 1024 * 1024}
        mode="dropzone"
        value={jdFile}
        onChange={(next) => {
          setJdFile(next instanceof File ? next : null);
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
        rows={5}
        placeholder="Paste the role summary, requirements, and responsibilities…"
      />
      <Button
        label="Analyse job description"
        variant="secondary"
        isLoading={isJdLoading}
        isDisabled={!jdFile && !jdText.trim()}
        clickAction={handleAnalyzeJd}
      />

      {jdPreview ? (
        <VStack gap={2}>
          <Banner
            status="success"
            title={
              jdPreview.role_title
                ? `Target role: ${jdPreview.role_title}`
                : 'Job description captured'
            }
            description={
              jdPreview.company_name
                ? `${jdPreview.company_name} · source: ${jdPreview.source_type}`
                : `Source: ${jdPreview.source_type}`
            }
          />
          {jdPreview.requirements.length > 0 ? (
            <VStack gap={1}>
              <Text type="label">Requirements we’ll score against</Text>
              {jdPreview.requirements.slice(0, 4).map((req) => (
                <Text key={req} as="p" color="secondary">
                  • {req}
                </Text>
              ))}
            </VStack>
          ) : null}
          {jdPreview.keywords.length > 0 ? (
            <Text as="p" color="secondary">
              Keywords: {jdPreview.keywords.slice(0, 8).join(', ')}
            </Text>
          ) : null}
          {jdPreview.whiteboard_recommendation?.recommended ? (
            <Banner
              status="info"
              title="This role likely includes a live design exercise"
              description={
                jdPreview.whiteboard_recommendation.reason ??
                'Practice on the timed whiteboard before verbal Q&A alone.'
              }
            />
          ) : null}
        </VStack>
      ) : null}

      {whiteboardHint?.recommended && !jdPreview?.whiteboard_recommendation?.recommended ? (
        <Banner
          status="info"
          title="Whiteboard practice recommended"
          description={whiteboardHint.reason ?? 'Add a timed canvas run to your prep.'}
        />
      ) : null}

      {jdPreview?.whiteboard_recommendation?.recommended ||
      whiteboardHint?.recommended ? (
        <Link href="/whiteboard" className="aced-orient__cta">
          Open timed whiteboard practice →
        </Link>
      ) : null}

      <Divider />

      <header
        className={`aced-section-head${cvDone ? ' aced-section-head--active' : ''}`}
      >
        <p className="aced-section-head__eyebrow">Step 3 · Start</p>
        <Heading level={3}>Begin the interview</Heading>
      </header>
      <div className="aced-cta-bar">
        <div className="aced-cta-bar__copy">
          <Text type="label">
            {preview
              ? jdPreview
                ? 'CV + JD ready. Start when you are'
                : 'CV ready. A JD is optional but sharpens scoring'
              : 'Analyse a CV to unlock practice'}
          </Text>
          <Text type="supporting" color="secondary" as="p">
            Personalised questions and a clear strong / weak rubric come next.
          </Text>
        </div>
        <Button
          label="Start personalised practice interview"
          variant="primary"
          isLoading={isLoading}
          isDisabled={!preview}
          clickAction={handleStart}
        />
      </div>
    </VStack>
  );
}
