import {describe, expect, it} from 'vitest';
import {evaluateCvEvidence, buildCvEvidenceTargets} from '@/lib/cv-evidence';
import {gradeTranscriptLocally} from '@/lib/grading';
import {recommendWhiteboardFromJd} from '@/lib/interview/format';
import {analyzeJobDescriptionText} from '@/lib/criteria';
import type {CvAnalysis} from '@/lib/cv-parse';

const CV: CvAnalysis = {
  parsed_text: 'Worked at Nova Banking on onboarding.',
  skills_extracted: ['Figma', 'UX Research'],
  experience_years: 5,
  projects: ['Nova Banking onboarding', 'HealthTrack dashboard'],
  companies: ['Nova Banking', 'HealthTrack'],
  roles: ['Senior Product Designer'],
};

describe('CV evidence grading', () => {
  it('detects cited projects in personal answers', () => {
    const result = evaluateCvEvidence({
      transcription:
        'At Nova Banking I led the onboarding redesign — we ran usability tests and shipped an 18% conversion lift.',
      cv: CV,
      isPersonal: true,
    });
    expect(result.hit.length).toBeGreaterThan(0);
    expect(result.hit.some((h) => /nova/i.test(h))).toBe(true);
  });

  it('flags missing CV evidence on personal answers', () => {
    const result = evaluateCvEvidence({
      transcription:
        'I always follow the double diamond and believe in user-centric design with strong collaboration.',
      cv: CV,
      isPersonal: true,
    });
    expect(result.missed.length).toBeGreaterThan(0);
  });

  it('builds evidence targets from CV', () => {
    const targets = buildCvEvidenceTargets(CV);
    expect(targets.some((t) => t.includes('Nova'))).toBe(true);
  });
});

describe('local grading', () => {
  it('grades substantive answers higher than empty ones', () => {
    const criteria = {
      mustCover: ['problem framing', 'research', 'decision to ship'],
      strongSignals: ['specific metric'],
      weakSignals: ['generic passion'],
      roleKeywords: ['fintech'],
      summary: 'Test rubric',
    };
    const strong = gradeTranscriptLocally({
      questionText: 'Tell me about a project',
      transcription:
        'For Nova Banking onboarding we defined the problem as KYC drop-off, interviewed users, explored three Figma prototypes, and shipped after usability testing — conversion up 18%.',
      criteria,
      cv: CV,
      isPersonal: true,
    });
    const weak = gradeTranscriptLocally({
      questionText: 'Tell me about a project',
      transcription: 'I am passionate about design.',
      criteria,
      cv: CV,
      isPersonal: true,
    });
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.evaluatedAgainst.cvEvidenceHit?.length ?? 0).toBeGreaterThan(0);
  });
});

describe('JD whiteboard routing', () => {
  it('recommends whiteboard for case study JDs', () => {
    const jd = analyzeJobDescriptionText(`
      Product Designer
      On-site design challenge and whiteboard session required.
      Present a case study from your portfolio.
    `);
    const rec = recommendWhiteboardFromJd(jd);
    expect(rec.recommended).toBe(true);
    expect(rec.matchedTerms.length).toBeGreaterThan(0);
  });

  it('does not recommend whiteboard for generic JDs', () => {
    const jd = analyzeJobDescriptionText(`
      Product Designer — remote
      Requirements: Figma, research, collaboration with PM
    `);
    const rec = recommendWhiteboardFromJd(jd);
    expect(rec.recommended).toBe(false);
  });
});
