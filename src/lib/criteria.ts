import type {QuestionCategory} from '@/lib/types';
import type {CvAnalysis} from '@/lib/cv-parse';

export type JobDescriptionAnalysis = {
  raw_text: string;
  role_title: string | null;
  company_name: string | null;
  requirements: string[];
  responsibilities: string[];
  keywords: string[];
};

export type AnswerCriteria = {
  /** Topics a strong answer should cover for THIS question + role */
  mustCover: string[];
  /** Phrases/behaviors that signal a strong answer */
  strongSignals: string[];
  /** Phrases/behaviors that signal a weak answer */
  weakSignals: string[];
  /** JD keywords the answer should connect to when relevant */
  roleKeywords: string[];
  summary: string;
};

export type GeneratedQuestionWithCriteria = {
  text: string;
  category: QuestionCategory;
  is_personal: boolean;
  criteria: AnswerCriteria;
};

const DESIGN_REQUIREMENT_HINTS = [
  'figma',
  'prototype',
  'research',
  'usability',
  'accessibility',
  'design system',
  'stakeholder',
  'product',
  'metrics',
  'experiment',
  'mobile',
  'enterprise',
  'b2b',
  'b2c',
  'workshop',
  'collaboration',
  'cross-functional',
  'handoff',
  'visual',
  'interaction',
  'user journey',
  'information architecture',
];

export function analyzeJobDescriptionText(raw: string): JobDescriptionAnalysis {
  const text = raw.replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const role_title =
    matchFirst(
      text,
      /(?:job\s*title|role|position)\s*[:\-–]\s*([^\n]{3,80})/i,
    ) ||
    lines.find(
      (l) =>
        /\b(designer|design lead|product design|ux|ui)\b/i.test(l) &&
        l.length < 80,
    ) ||
    null;

  const company_name =
    matchFirst(
      text,
      /(?:company|about)\s*[:\-–]\s*([A-Z][A-Za-z0-9&.'\-\s]{2,40})/,
    ) || null;

  const requirements = extractSectionItems(lines, [
    /requirements?/i,
    /qualifications?/i,
    /what (?:you'?ll|you will) need/i,
    /must have/i,
    /you have/i,
  ]);

  const responsibilities = extractSectionItems(lines, [
    /responsibilities/i,
    /what (?:you'?ll|you will) do/i,
    /the role/i,
    /about the (?:job|role)/i,
  ]);

  const lower = text.toLowerCase();
  const keywords = DESIGN_REQUIREMENT_HINTS.filter((k) => lower.includes(k));

  // Pull capitalized skill-ish tokens from requirements
  for (const req of requirements.slice(0, 12)) {
    for (const token of req.split(/[,/;•|]/)) {
      const cleaned = token.trim();
      if (cleaned.length > 2 && cleaned.length < 40) {
        keywords.push(cleaned.toLowerCase());
      }
    }
  }

  return {
    raw_text: text.slice(0, 12000),
    role_title: role_title?.trim() ?? null,
    company_name: company_name?.trim() ?? null,
    requirements: requirements.slice(0, 10),
    responsibilities: responsibilities.slice(0, 10),
    keywords: unique(keywords).slice(0, 20),
  };
}

function matchFirst(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m?.[1]?.trim() ?? null;
}

function extractSectionItems(lines: string[], headers: RegExp[]): string[] {
  const items: string[] = [];
  let inSection = false;
  for (const line of lines) {
    if (headers.some((h) => h.test(line)) && line.length < 60) {
      inSection = true;
      continue;
    }
    if (inSection) {
      if (
        /^(responsibilities|requirements|qualifications|benefits|about|nice to have)\b/i.test(
          line,
        ) &&
        !headers.some((h) => h.test(line))
      ) {
        // maybe next section
        if (items.length > 0) break;
      }
      const cleaned = line.replace(/^[-•*]\s*/, '');
      if (cleaned.length > 8 && cleaned.length < 180) items.push(cleaned);
      if (items.length >= 10) break;
    }
  }
  return unique(items);
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function buildAnswerCriteria(input: {
  questionText: string;
  category: QuestionCategory;
  isPersonal: boolean;
  cv: CvAnalysis;
  jd: JobDescriptionAnalysis | null;
}): AnswerCriteria {
  const {questionText, category, cv, jd} = input;
  const skill = cv.skills_extracted[0] ?? 'your craft';
  const project = cv.projects[0] ?? 'a CV project';
  const role = jd?.role_title ?? cv.roles[0] ?? 'the target role';
  const company = jd?.company_name ?? cv.companies[0] ?? 'the company';
  const jdReq = jd?.requirements[0];
  const jdKeyword = jd?.keywords.slice(0, 4) ?? [];

  const mustCover: string[] = [
    'Name the problem and who it was for',
    'Explain at least one option you considered and why you chose the shipped approach',
    'Include one concrete artifact, metric, or timeline from your work',
  ];

  if (input.isPersonal) {
    mustCover.push(`Connect the answer to specific CV work (e.g. ${truncate(project, 40)})`);
  }

  if (jd) {
    mustCover.push(
      `Show fit for ${role}${jdReq ? ` — especially: ${truncate(jdReq, 70)}` : ''}`,
    );
  }

  switch (category) {
    case 'communication':
      mustCover.push('Describe how you aligned stakeholders or handled disagreement');
      break;
    case 'visual_design':
      mustCover.push('Mention visual/interaction constraints and the craft decision you made');
      break;
    case 'whiteboard':
      mustCover.push('Structure the whiteboard: users → flows → edge cases → success metric');
      break;
    case 'interaction':
      mustCover.push('Call out interaction states (empty, error, loading, edge cases)');
      break;
    default:
      mustCover.push('Walk problem → exploration → decision → outcome');
  }

  const strongSignals = [
    'STAR-like structure: situation → actions → outcome',
    `Specific tools/methods from your CV (e.g. ${skill})`,
    'Tradeoffs named explicitly (“we chose X over Y because…”)',
    'Evidence: research insight, usability finding, or metric',
    jd
      ? `Language that matches the JD (${jdKeyword.join(', ') || 'role keywords'})`
      : 'Clear ownership (“I led / I decided / I measured”)',
  ];

  const weakSignals = [
    'Generic claims with no project (“I always put users first”)',
    'Tool laundry list with no decision or outcome',
    'Skipping the problem and jumping straight to UI',
    'No collaboration or constraints mentioned',
    'Answer under ~45 seconds / very few specifics',
    jd ? `Ignoring JD priorities for ${company} / ${role}` : 'No link back to portfolio evidence',
  ];

  const summary = jd
    ? `Strong answers prove you can do this question well for ${role} at ${company}, using real CV evidence — not generic design talk.`
    : `Strong answers use your CV evidence on “${truncate(questionText, 70)}” with clear process, specifics, and tradeoffs.`;

  return {
    mustCover: unique(mustCover).slice(0, 6),
    strongSignals: unique(strongSignals).slice(0, 6),
    weakSignals: unique(weakSignals).slice(0, 6),
    roleKeywords: jdKeyword,
    summary,
  };
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
