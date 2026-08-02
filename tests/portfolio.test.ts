import {describe, expect, it} from 'vitest';
import {
  assessPastedPortfolioText,
  htmlToReadableText,
  normalizePortfolioUrl,
} from '@/lib/portfolio/fetch';
import {auditPortfolioHeuristic} from '@/lib/portfolio/audit';
import {auditPortfolioJdFit} from '@/lib/portfolio/jd-fit';
import {analyzeJobDescriptionText} from '@/lib/criteria';

const STRONG_CASE_STUDY = `
Nova Banking — Mobile onboarding redesign
Problem: 42% drop-off during KYC verification for new retail customers.
My role: Lead product designer — research, flows, UI, handoff with engineering.
Process: We ran 8 user interviews, mapped the existing journey, prototyped 3 options in Figma,
and usability tested with 12 participants over two sprints.
Outcome: Shipped MVP in Q3 — conversion improved 18%, support tickets down 24%.
Tools: Figma, Miro, design system components.

HealthTrack — Patient dashboard
Challenge: Clinicians struggled to scan vitals on dense tablet layouts.
I led IA and interaction design with PM and two engineers.
We iterated on wireframes, ran A/B test on card vs table layout.
Result: Task completion time reduced 31% for ward nurses.

Skills: Product design, UX research, prototyping, accessibility, design systems.
`.trim();

describe('portfolio fetch', () => {
  it('normalizes bare domains to https', () => {
    const url = normalizePortfolioUrl('example.com/portfolio');
    expect(url?.href).toBe('https://example.com/portfolio');
  });

  it('rejects localhost URLs', () => {
    expect(normalizePortfolioUrl('http://localhost:3000')).toBeNull();
  });

  it('extracts readable text from HTML', () => {
    const html = `<html><head><title>Jane Designer</title></head><body>
      <h1>Case study</h1><p>We improved onboarding by 18% after usability testing.</p>
      <script>alert('x')</script></body></html>`;
    const text = htmlToReadableText(html);
    expect(text).toContain('Case study');
    expect(text).toContain('18%');
    expect(text).not.toContain('alert');
  });

  it('accepts substantive pasted case study text', () => {
    const extract = assessPastedPortfolioText(STRONG_CASE_STUDY);
    expect(extract.ok).toBe(true);
    expect(extract.confidence).not.toBe('insufficient');
    expect(extract.wordCount).toBeGreaterThan(100);
  });

  it('refuses insufficient pasted text', () => {
    const extract = assessPastedPortfolioText('Hi, I am a designer.');
    expect(extract.ok).toBe(false);
    expect(extract.confidence).toBe('insufficient');
  });
});

describe('portfolio audit', () => {
  it('scores strong case study content', () => {
    const audit = auditPortfolioHeuristic({
      text: STRONG_CASE_STUDY,
      pageTitle: 'Jane — Portfolio',
      confidence: 'high',
    });
    expect(audit.canScore).toBe(true);
    expect(audit.score).toBeGreaterThan(60);
    expect(audit.caseStudies.length).toBeGreaterThan(0);
    expect(audit.stats.metricMentions).toBeGreaterThan(0);
    expect(audit.stats.processSignals).toBeGreaterThan(2);
  });

  it('does not score insufficient reads', () => {
    const audit = auditPortfolioHeuristic({
      text: 'Coming soon',
      pageTitle: null,
      confidence: 'insufficient',
    });
    expect(audit.canScore).toBe(false);
    expect(audit.score).toBeNull();
  });

  it('flags thin process on generic copy', () => {
    const audit = auditPortfolioHeuristic({
      text: `
        Project Alpha
        Project Beta
        I design beautiful interfaces with passion and creativity.
        I love user-centric innovative solutions.
      `.trim(),
      pageTitle: null,
      confidence: 'medium',
    });
    const critical = audit.flags.filter((f) => f.severity === 'critical');
    expect(critical.some((f) => f.id === 'thin-process')).toBe(true);
  });
});

describe('portfolio JD fit', () => {
  it('finds alignment between portfolio and fintech JD', () => {
    const jd = analyzeJobDescriptionText(`
      Senior Product Designer — Nova Banking
      Requirements: mobile onboarding, usability testing, fintech, Figma, design systems
    `);
    const fit = auditPortfolioJdFit({
      portfolioText: STRONG_CASE_STUDY,
      jd,
      portfolioConfidence: 'high',
    });
    expect(fit.canAssess).toBe(true);
    expect(fit.matchScore).not.toBeNull();
    expect((fit.matchScore ?? 0) > 40).toBe(true);
    expect(fit.aligned.length).toBeGreaterThan(0);
  });

  it('skips JD fit on insufficient portfolio read', () => {
    const jd = analyzeJobDescriptionText('Product Designer — research, Figma');
    const fit = auditPortfolioJdFit({
      portfolioText: 'Designer portfolio',
      jd,
      portfolioConfidence: 'insufficient',
    });
    expect(fit.canAssess).toBe(false);
    expect(fit.matchScore).toBeNull();
  });
});
