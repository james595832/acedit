import type {GradeResult} from '@/lib/types';
import type {AnswerCriteria} from '@/lib/criteria';
import type {CvAnalysis} from '@/lib/cv-parse';
import {evaluateCvEvidence} from '@/lib/cv-evidence';

export const RUBRIC_CRITERIA = [
  'Design thinking — problem framing, options, decision to ship',
  'Communication — clear structure a hiring manager can follow',
  'Depth — specific examples vs generic platitudes',
  'Design knowledge — craft, research, accessibility, collaboration',
  'Role fit — connects answer to the target job description',
] as const;

function scoreAxis(hits: number, maxHits: number, base = 4): number {
  const ratio = maxHits === 0 ? 0 : hits / maxHits;
  return Math.min(10, Math.max(2, Math.round(base + ratio * 6)));
}

function signalHit(answerLower: string, signal: string): boolean {
  const tokens = signal
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .split(/[^a-z0-9+/]+/)
    .filter((t) => t.length > 3)
    .slice(0, 6);
  if (tokens.length === 0) return false;
  const hits = tokens.filter((t) => answerLower.includes(t)).length;
  return hits >= Math.min(2, tokens.length);
}

/**
 * Scores the actual transcript against:
 * 1) core design-interview rubric
 * 2) personalized must-cover / strong / weak signals (from CV + JD + question)
 */
export function gradeTranscriptLocally(input: {
  questionText: string;
  transcription: string;
  criteria?: AnswerCriteria | null;
  cv?: CvAnalysis | null;
  isPersonal?: boolean;
}): GradeResult {
  const answer = input.transcription.trim();
  const lower = answer.toLowerCase();
  const words = answer.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const criteria = input.criteria;
  const cvEvidence =
    input.cv && input.isPersonal !== undefined
      ? evaluateCvEvidence({
          transcription: answer,
          cv: input.cv,
          isPersonal: input.isPersonal,
        })
      : {hit: [] as string[], missed: [] as string[]};

  const emptyEvaluated = {
    question: input.questionText,
    answerExcerpt: answer || '(empty)',
    criteria: [...RUBRIC_CRITERIA],
    mustCover: criteria?.mustCover ?? [],
    mustCoverHit: [] as string[],
    mustCoverMissed: criteria?.mustCover ?? [],
    strongSignalsHit: [] as string[],
    weakSignalsHit: [] as string[],
    roleKeywordsHit: [] as string[],
    cvEvidenceHit: cvEvidence.hit,
    cvEvidenceMissed: cvEvidence.missed,
  };

  if (wordCount < 12) {
    return {
      score: 28,
      scoreBreakdown: {
        designThinking: 3,
        communication: 2,
        depth: 2,
        knowledge: 3,
        roleFit: 2,
      },
      feedback:
        'Too short to judge against the criteria. Cover the must-hit points with a real project example.',
      strengths: [],
      improvements: (criteria?.mustCover ?? []).slice(0, 3),
      evaluatedAgainst: emptyEvaluated,
      stub: true,
    };
  }

  const processHits = [
    /problem|brief|goal|user need|hypothesis/,
    /research|interview|usability|test|insight/,
    /option|explor|concept|ideat|wireframe|prototype/,
    /decid|trade.?off|ship|mvp|priorit/,
    /process|framework|double diamond|jobs.to.be.done/,
  ].filter((re) => re.test(lower)).length;

  const communicationHits = [
    wordCount >= 40,
    wordCount >= 90,
    /first|then|next|finally|because|so that/,
    /we |i |my team|stakeholder/,
  ].filter(Boolean).length;

  const depthHits = [
    /figma|sketch|framer|prototype|component|design system/,
    /metric|conversion|retention|nps|time.on.task|success rate/,
    /\d+%|\d+ users|week|sprint|quarter/,
    /for example|specifically|in that project/,
  ].filter((re) => re.test(lower)).length;

  const knowledgeHits = [
    /accessib|wcag|aria|contrast|keyboard/,
    /persona|journey|flow|information architecture|ia\b/,
    /engineer|pm|product|stakeholder|handoff/,
    /constraint|edge case|empty state|error state|mobile/,
  ].filter((re) => re.test(lower)).length;

  const mustCover = criteria?.mustCover ?? [];
  const mustCoverHit = mustCover.filter((item) => signalHit(lower, item));
  const mustCoverMissed = mustCover.filter((item) => !signalHit(lower, item));
  const strongSignalsHit = (criteria?.strongSignals ?? []).filter((s) =>
    signalHit(lower, s),
  );
  const weakSignalsHit = (criteria?.weakSignals ?? []).filter((s) =>
    signalHit(lower, s),
  );
  const roleKeywordsHit = (criteria?.roleKeywords ?? []).filter((k) =>
    lower.includes(k.toLowerCase()),
  );

  const designThinking = scoreAxis(processHits, 5, 3);
  const communication = scoreAxis(communicationHits, 4, 3);
  const depth = scoreAxis(depthHits, 4, 3);
  const knowledge = scoreAxis(knowledgeHits, 4, 3);

  const mustRatio =
    mustCover.length === 0 ? 0.5 : mustCoverHit.length / mustCover.length;
  const roleKeywordRatio =
    !criteria?.roleKeywords?.length
      ? mustRatio
      : roleKeywordsHit.length / Math.max(1, Math.min(4, criteria.roleKeywords.length));
  let roleFit = Math.round(3 + mustRatio * 4 + roleKeywordRatio * 3);
  roleFit = Math.max(2, Math.min(10, roleFit));
  roleFit = Math.max(2, roleFit - weakSignalsHit.length);
  if (input.isPersonal && cvEvidence.hit.length) {
    roleFit = Math.min(10, roleFit + Math.min(2, cvEvidence.hit.length));
  } else if (input.isPersonal && cvEvidence.missed.length >= 2) {
    roleFit = Math.max(2, roleFit - 2);
  }

  let score = Math.round(
    ((designThinking + communication + depth + knowledge + roleFit) / 50) * 100,
  );
  score = Math.max(
    15,
    Math.min(98, score + strongSignalsHit.length * 2 - weakSignalsHit.length * 4),
  );

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (mustCoverHit.length) {
    strengths.push(`Covered: ${mustCoverHit.slice(0, 2).join('; ')}`);
  }
  if (strongSignalsHit.length) {
    strengths.push(`Strong signal: ${strongSignalsHit[0]}`);
  }
  if (roleKeywordsHit.length) {
    strengths.push(`Tied to JD terms: ${roleKeywordsHit.slice(0, 3).join(', ')}`);
  }
  if (cvEvidence.hit.length) {
    strengths.push(`CV evidence cited: ${cvEvidence.hit.slice(0, 2).join('; ')}`);
  }
  if (mustCoverMissed.length) {
    improvements.push(`Still missing: ${mustCoverMissed[0]}`);
  }
  if (weakSignalsHit.length) {
    improvements.push(`Watch for weak pattern: ${weakSignalsHit[0]}`);
  }
  if (input.isPersonal && cvEvidence.missed.length) {
    improvements.push(
      `Name a CV project or employer: ${cvEvidence.missed.slice(0, 2).join(' or ')}`,
    );
  }
  if (depth < 7) {
    improvements.push('Add a concrete artifact, metric, or timeline');
  }

  const feedbackParts = [
    criteria?.summary ??
      'Compared your answer to the question and a design-interview rubric.',
    mustCoverHit.length >= Math.ceil(mustCover.length * 0.6)
      ? 'You hit most must-cover points for this question.'
      : 'Several must-cover points for this question were missing.',
    weakSignalsHit.length
      ? 'Some weak-answer patterns showed up — tighten with specifics.'
      : 'Avoided the worst weak-answer patterns.',
  ];

  return {
    score,
    scoreBreakdown: {
      designThinking,
      communication,
      depth,
      knowledge,
      roleFit,
    },
    feedback: feedbackParts.join(' '),
    strengths,
    improvements,
    evaluatedAgainst: {
      question: input.questionText,
      answerExcerpt: answer.slice(0, 280) + (answer.length > 280 ? '…' : ''),
      criteria: [...RUBRIC_CRITERIA],
      mustCover,
      mustCoverHit,
      mustCoverMissed,
      strongSignalsHit,
      weakSignalsHit,
      roleKeywordsHit,
      cvEvidenceHit: cvEvidence.hit,
      cvEvidenceMissed: cvEvidence.missed,
    },
    stub: true,
  };
}
