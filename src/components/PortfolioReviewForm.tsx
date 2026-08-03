'use client';

import {useState} from 'react';
import Link from 'next/link';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Button} from '@astryxdesign/core/Button';
import {VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Banner} from '@astryxdesign/core/Banner';
import {Divider} from '@astryxdesign/core/Divider';
import {PortfolioReport} from '@/components/PortfolioReport';
import type {PortfolioAuditResult, PortfolioJdFit} from '@/lib/portfolio/types';

type AnalyseResponse = {
  ok: boolean;
  source: 'url' | 'paste';
  extract: {
    url: string;
    pageTitle: string | null;
    wordCount: number;
    confidence: string;
    blockedReason: string | null;
  };
  audit: PortfolioAuditResult | null;
  jdFit: PortfolioJdFit | null;
  suggestPaste: boolean;
  stub?: boolean;
};

export function PortfolioReviewForm() {
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [jdText, setJdText] = useState('');
  const [showPasteFallback, setShowPasteFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyseResponse | null>(null);

  async function runAnalyse(usePaste: boolean) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/portfolio/analyse', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          url: usePaste ? undefined : url.trim(),
          pasted_text: usePaste ? pastedText.trim() : undefined,
          jd_text: jdText.trim() || undefined,
        }),
      });
      const data = (await res.json()) as AnalyseResponse & {error?: string};
      if (!res.ok) throw new Error(data.error ?? 'Review failed');

      setResult(data);
      if (!data.ok) {
        setShowPasteFallback(data.suggestPaste);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAnalyseUrl() {
    if (!url.trim()) {
      setError('Enter your public portfolio URL.');
      return;
    }
    await runAnalyse(false);
  }

  async function handleAnalysePaste() {
    if (!pastedText.trim()) {
      setError('Paste at least one case study: problem, process, outcome.');
      return;
    }
    await runAnalyse(true);
  }

  return (
    <VStack gap={4}>
      {error ? (
        <Banner status="error" title="Review error" description={error} />
      ) : null}

      <Banner
        status="info"
        title="Honest review only"
        description="We score what we can actually read. If a site blocks us or has too little text, we won’t invent a grade. Paste your case study copy instead."
      />

      <header className="aced-section-head aced-section-head--active">
        <p className="aced-section-head__eyebrow">Step 1</p>
        <Heading level={3}>Portfolio URL</Heading>
      </header>
      <Text as="p" color="secondary">
        Link to your public portfolio or a single case study page. Password-protected
        or JS-only sites may not work. Use paste below if needed.
      </Text>
      <TextInput
        label="Portfolio URL"
        value={url}
        onChange={setUrl}
        placeholder="https://yourname.com or https://yourname.com/project"
        isRequired={!showPasteFallback}
      />
      <Button
        label="Review portfolio"
        variant="primary"
        isLoading={isLoading && !showPasteFallback}
        isDisabled={!url.trim() && !showPasteFallback}
        clickAction={handleAnalyseUrl}
      />

      {result && !result.ok ? (
        <Banner
          status="warning"
          title="Could not review this URL reliably"
          description={
            result.extract.blockedReason ??
            'Try pasting your case study text for a full review.'
          }
        />
      ) : null}

      <Divider />

      <header className="aced-section-head">
        <p className="aced-section-head__eyebrow">
          {showPasteFallback ? 'Recommended' : 'Step 2 · Fallback'}
        </p>
        <Heading level={3}>Paste case study text</Heading>
      </header>
      <Text as="p" color="secondary">
        Best results: paste 2 or 3 case studies with problem, your role,
        process, and outcomes. This avoids scrape limits and matches what
        interviewers read.
      </Text>
      <TextArea
        label="Case study copy"
        value={pastedText}
        onChange={setPastedText}
        rows={10}
        placeholder="Project name&#10;Problem…&#10;My role…&#10;Process…&#10;Outcome / metrics…"
        isOptional={!showPasteFallback}
      />

      <Divider />

      <header className="aced-section-head">
        <p className="aced-section-head__eyebrow">Optional</p>
        <Heading level={3}>Target job description</Heading>
      </header>
      <Text as="p" color="secondary">
        Paste the role you are applying for and we check whether your portfolio
        evidence matches (only shown when the read quality is high enough).
      </Text>
      <TextArea
        label="Job description"
        value={jdText}
        onChange={setJdText}
        rows={5}
        isOptional
        placeholder="Role title, requirements, responsibilities…"
      />

      <Button
        label={
          showPasteFallback
            ? 'Review pasted text'
            : 'Or review pasted text instead'
        }
        variant={showPasteFallback ? 'primary' : 'secondary'}
        isLoading={isLoading && (showPasteFallback || Boolean(pastedText.trim()))}
        isDisabled={!pastedText.trim()}
        clickAction={handleAnalysePaste}
      />

      {result?.ok && result.audit ? (
        <PortfolioReport
          audit={result.audit}
          jdFit={result.jdFit}
          extract={result.extract}
          stub={result.stub}
        />
      ) : null}

      {result?.ok && result.audit?.canScore ? (
        <nav className="aced-next-steps" aria-label="Next steps">
          <p className="aced-next-steps__label">Ready for the next step?</p>
          <Link className="aced-orient__cta" href="/interview">
            Practice interview for this role →
          </Link>
        </nav>
      ) : null}
    </VStack>
  );
}
