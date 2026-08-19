import type {GradeResult, InterviewQuestionKind} from '@/lib/types';
import type {AnswerCriteria} from '@/lib/criteria';
import {inferQuestionKind} from '@/lib/criteria';
import type {CvAnalysis} from '@/lib/cv-parse';
import {evaluateCvEvidence} from '@/lib/cv-evidence';

export const RUBRIC_CRITERIA = [
  'Design thinking: problem framing, options, decision to ship',
  'Communication: clear structure a hiring manager can follow',
  'Depth: specific examples vs generic platitudes',
  'Design knowledge: craft, research, accessibility, collaboration',
  'Role fit: connects answer to the target job description',
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
        'Too short for a real interview. Take a breath and answer in full sentences, with one example from your CV.',
      strengths: [],
      improvements: (criteria?.mustCover ?? []).slice(0, 3),
      evaluatedAgainst: emptyEvaluated,
      stub: true,
    };
  }

  const kind =
    criteria?.kind ?? inferQuestionKind(input.questionText);
  const axes = axisHitsForKind(kind, lower, wordCount);

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

  const designThinking = scoreAxis(axes.designThinking, axes.designThinkingMax, 3);
  const communication = scoreAxis(axes.communication, axes.communicationMax, 3);
  const depth = scoreAxis(axes.depth, axes.depthMax, 3);
  const knowledge = scoreAxis(axes.knowledge, axes.knowledgeMax, 3);

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

  if (input.isPersonal && cvEvidence.hit.length && wordCount >= 25) {
    score = Math.min(98, score + 6);
  }

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
  if (kind === 'intro' && wordCount > 320) {
    improvements.push('Tighten it — a real intro is closer to 90 seconds than a full CV reading');
  }
  if (depth < 7 && kind !== 'ambition') {
    improvements.push('Add a concrete artifact, metric, or timeline');
  }

  if (score >= 78) {
    improvements.splice(3);
  }

  const feedback = coachFeedback(score, strengths, improvements);

  return {
    score,
    scoreBreakdown: {
      designThinking,
      communication,
      depth,
      knowledge,
      roleFit,
    },
    feedback,
    strengths,
    improvements: improvements.slice(0, score >= 78 ? 2 : 4),
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

type AxisHits = {
  designThinking: number;
  designThinkingMax: number;
  communication: number;
  communicationMax: number;
  depth: number;
  depthMax: number;
  knowledge: number;
  knowledgeMax: number;
};

function countHits(lower: string, patterns: RegExp[]): number {
  return patterns.filter((re) => re.test(lower)).length;
}

function axisHitsForKind(
  kind: InterviewQuestionKind,
  lower: string,
  wordCount: number,
): AxisHits {
  const communication = [
    wordCount >= 40,
    wordCount >= 80,
    /first|then|next|finally|because|so that|currently|previously/,
    /\bi\b|\bwe\b|my team/,
  ].filter(Boolean).length;

  const craftProcess = countHits(lower, [
    /problem|brief|goal|user need|hypothesis/,
    /research|interview|usability|test|insight/,
    /option|explor|concept|ideat|wireframe|prototype/,
    /decid|trade.?off|ship|mvp|priorit/,
    /process|framework|double diamond|jobs.to.be.done/,
  ]);
  const craftDepth = countHits(lower, [
    /figma|sketch|framer|prototype|component|design system/,
    /metric|conversion|retention|nps|time.on.task|success rate/,
    /\d+%|\d+ users|week|sprint|quarter/,
    /for example|specifically|in that project/,
  ]);
  const craftKnowledge = countHits(lower, [
    /accessib|wcag|aria|contrast|keyboard/,
    /persona|journey|flow|information architecture|ia\b/,
    /engineer|pm|product|stakeholder|handoff/,
    /constraint|edge case|empty state|error state|mobile/,
  ]);

  if (kind === 'intro') {
    return {
      designThinking: countHits(lower, [
        /currently|right now|these days/,
        /previously|before that|after|then i/,
        /looking for|next|want to|here because/,
      ]),
      designThinkingMax: 3,
      communication,
      communicationMax: 4,
      depth: countHits(lower, [
        /intern|designer|product|ux|ui/,
        /\d{4}|year/,
        /for example|specifically|at [a-z]/,
        /project|portfolio|shipped|launched/,
      ]),
      depthMax: 4,
      knowledge: craftKnowledge,
      knowledgeMax: 4,
    };
  }

  if (kind === 'motivation') {
    return {
      designThinking: countHits(lower, [
        /product|user|mission|problem/,
        /team|culture|how they|way of working/,
        /contribute|learn|first|90 days/,
      ]),
      designThinkingMax: 3,
      communication,
      communicationMax: 4,
      depth: countHits(lower, [
        /because|specifically|for example/,
        /read|researched|noticed|looked at/,
        /company|role|team/,
      ]),
      depthMax: 3,
      knowledge: craftKnowledge,
      knowledgeMax: 4,
    };
  }

  if (kind === 'self_awareness') {
    return {
      designThinking: countHits(lower, [
        /strength|good at|i tend to/,
        /weakness|struggle|working on/,
        /because|so i|now i/,
      ]),
      designThinkingMax: 3,
      communication,
      communicationMax: 4,
      depth: countHits(lower, [
        /for example|when i|on .+ project/,
        /feedback|critique|pm|engineer/,
        /catch|notice|mitigat|working on/,
      ]),
      depthMax: 3,
      knowledge: craftKnowledge,
      knowledgeMax: 4,
    };
  }

  if (kind === 'conflict') {
    return {
      designThinking: countHits(lower, [
        /situation|stake|disagreed|conflict/,
        /i (said|asked|proposed|pushed|listened)/,
        /outcome|resolved|landed|we (shipped|delayed|tested)/,
      ]),
      designThinkingMax: 3,
      communication,
      communicationMax: 4,
      depth: countHits(lower, [
        /pm|engineer|stakeholder|design lead/,
        /user|evidence|research|timeline/,
        /for example|specifically/,
      ]),
      depthMax: 3,
      knowledge: craftKnowledge,
      knowledgeMax: 4,
    };
  }

  if (kind === 'ambition') {
    return {
      designThinking: countHits(lower, [
        /five years|in 5 years|direction|path/,
        /this role|this team|a role like/,
        /better at|grow|lead|craft|domain/,
      ]),
      designThinkingMax: 3,
      communication,
      communicationMax: 4,
      depth: countHits(lower, [
        /because|specifically/,
        /learn|mentor|system|research|product/,
      ]),
      depthMax: 2,
      knowledge: craftKnowledge,
      knowledgeMax: 4,
    };
  }

  if (kind === 'ai') {
    return {
      designThinking: countHits(lower, [
        /ai|llm|claude|chatgpt|copilot|cursor/,
        /check|review|judge|evaluat|quality/,
        /human|myself|i still|refus/,
      ]),
      designThinkingMax: 3,
      communication,
      communicationMax: 4,
      depth: craftDepth,
      depthMax: 4,
      knowledge: countHits(lower, [
        /prompt|output|bias|hallucin/,
        /research|prototype|copy|synth/,
        /engineer|pm|handoff/,
        /user|evidence|test/,
      ]),
      knowledgeMax: 4,
    };
  }

  return {
    designThinking: craftProcess,
    designThinkingMax: 5,
    communication,
    communicationMax: 4,
    depth: craftDepth,
    depthMax: 4,
    knowledge: craftKnowledge,
    knowledgeMax: 4,
  };
}

function coachFeedback(
  score: number,
  strengths: string[],
  improvements: string[],
): string {
  const win = strengths[0]
    ? strengths[0].replace(/^(Covered|Strong signal|CV evidence cited|Tied to JD terms):\s*/i, '')
    : null;
  const next = improvements[0]
    ? improvements[0].replace(/^(Still missing|Watch for weak pattern):\s*/i, '')
    : 'add one specific example and a clear outcome';

  if (score >= 78) {
    return win
      ? `That would land in a real room. You were specific where it counts: ${win}.`
      : 'That would land in a real room. Clear, specific, and easy to follow.';
  }
  if (score >= 58) {
    return `Solid — a hiring manager would follow you. To tighten it: ${next}.`;
  }
  if (score >= 42) {
    return `This would feel thin under pressure. Next time: ${next}.`;
  }
  return `This one wouldn’t carry the room yet. Next time: ${next}.`;
}

