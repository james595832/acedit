import type {InterviewQuestionKind, QuestionCategory} from '@/lib/types';
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
  kind?: InterviewQuestionKind;
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
  'ai',
  'llm',
  'machine learning',
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

export function inferQuestionKind(questionText: string): InterviewQuestionKind {
  const text = questionText.toLowerCase();
  if (/tell me about yourself/.test(text)) return 'intro';
  if (
    /why (do you want|this role|this company|this kind of role|would this be)/.test(
      text,
    )
  ) {
    return 'motivation';
  }
  if (/strengths? and (a |your )?weakness/.test(text)) return 'self_awareness';
  if (/conflict/.test(text) && !/stakeholder/.test(text)) return 'conflict';
  if (/five years|5 years/.test(text)) return 'ambition';
  if (/90 days|first ninety|collaboration model with engineers/.test(text)) {
    return 'horizon';
  }
  if (/stakeholder|pm pushing/.test(text)) return 'stakeholder';
  if (/\bai\b/.test(text) || /\bllm\b/.test(text)) return 'ai';
  if (/asks for|demonstrated that|job description/.test(text)) return 'jd_fit';
  return 'cv_project';
}

export function buildAnswerCriteria(input: {
  questionText: string;
  category: QuestionCategory;
  isPersonal: boolean;
  cv: CvAnalysis;
  jd: JobDescriptionAnalysis | null;
  kind?: InterviewQuestionKind;
}): AnswerCriteria {
  const kind = input.kind ?? inferQuestionKind(input.questionText);
  const skill = input.cv.skills_extracted[0] ?? 'your craft';
  const project = input.cv.projects[0] ?? 'a CV project';
  const role = input.jd?.role_title ?? input.cv.roles[0] ?? 'the target role';
  const company =
    input.jd?.company_name ?? input.cv.companies[0] ?? 'the company';
  const jdReq = input.jd?.requirements[0];
  const jdKeyword = input.jd?.keywords.slice(0, 4) ?? [];
  const ctx = {skill, project, role, company, jdReq, jdKeyword, jd: input.jd};

  const byKind = criteriaForKind(kind, ctx);
  if (kind === 'ai' && !byKind.mustCover.some((item) => /\bai\b/i.test(item))) {
    byKind.mustCover.push(
      'Say what AI did vs what you still did yourself, and how you checked the output',
    );
  }

  return {
    kind,
    mustCover: unique(byKind.mustCover).slice(0, 6),
    strongSignals: unique(byKind.strongSignals).slice(0, 6),
    weakSignals: unique(byKind.weakSignals).slice(0, 6),
    roleKeywords: jdKeyword,
    summary: byKind.summary,
  };
}

function criteriaForKind(
  kind: InterviewQuestionKind,
  ctx: {
    skill: string;
    project: string;
    role: string;
    company: string;
    jdReq?: string;
    jdKeyword: string[];
    jd: JobDescriptionAnalysis | null;
  },
): Omit<AnswerCriteria, 'kind' | 'roleKeywords'> {
  switch (kind) {
    case 'intro':
      return {
        mustCover: [
          'Who you are as a designer right now (level and focus)',
          'A short arc: 2–3 beats, not every job on the CV',
          `Name real work (e.g. ${truncate(ctx.company, 40)} or ${truncate(ctx.project, 40)})`,
          'Land on what you want next and why this conversation',
        ],
        strongSignals: [
          'Present → past → future in about 60–90 seconds',
          'Specific recent work, not a personality slogan',
          'Calm, spoken structure a hiring manager can retell',
        ],
        weakSignals: [
          'Reading the CV in chronological order',
          '“I’m passionate about design” with no proof',
          'Going longer than ~2 minutes or rambling',
        ],
        summary:
          'A strong intro is a 90-second trailer: who you are, one or two proof points from the CV, and why you’re here. Weak intros dump the whole CV or stay generic.',
      };
    case 'motivation':
      return {
        mustCover: ctx.jd
          ? [
              `Why ${ctx.company} — product, users, or mission, not “great culture”`,
              `Why ${ctx.role} given your CV, not a generic design job`,
              'What you would contribute in the first stretch',
            ]
          : [
              'Why this kind of product-design role next',
              `How recent work (e.g. ${truncate(ctx.company, 40)}) points that way`,
              'What you want from a team: craft, users, or how they ship',
            ],
        strongSignals: [
          ctx.jd
            ? `Something specific about ${ctx.company} a stranger couldn’t guess`
            : 'A clear next-step story, not “I need a job”',
          'Link to a real CV project or employer',
          'What you want to learn, not only what you’d get',
        ],
        weakSignals: [
          'Salary, visa, or “any design job” as the only reason',
          'Generic mission/culture praise with no evidence',
          'No connection to your actual work',
        ],
        summary: ctx.jd
          ? `They want to hear that you researched ${ctx.company} and can say why ${ctx.role} is the right next step. Vague flattery fails.`
          : 'Without a JD, this still has to sound like a real interview: why this direction, why now, with proof from your CV.',
      };
    case 'self_awareness':
      return {
        mustCover: [
          `One real strength with a CV example (e.g. ${truncate(ctx.project, 40)})`,
          'One genuine weakness — not a humblebrag',
          'What you do to manage the weakness so it doesn’t tank work',
        ],
        strongSignals: [
          'Strength proved with a decision or outcome, not a trait list',
          'Weakness another designer would recognise as real',
          'Ownership: how you catch it in critique or with a PM',
        ],
        weakSignals: [
          '“I work too hard” / “I’m a perfectionist”',
          'Strengths with no example',
          'No weakness, or a weakness you immediately disown',
        ],
        summary:
          'Strong answers pair a evidenced strength with a real weakness and a coping habit. Interviewers punish fake weaknesses.',
      };
    case 'conflict':
      return {
        mustCover: [
          'The situation and who was involved',
          'What you did — not only what “the team” did',
          'How it resolved, and what you would repeat or change',
        ],
        strongSignals: [
          'STAR: situation → what you did → outcome',
          'You can state the other person’s view without mocking it',
          'A design or product consequence, not only feelings',
        ],
        weakSignals: [
          '“I don’t really do conflict”',
          'Blaming a PM, engineer, or “difficult stakeholder”',
          'No resolution or learning',
        ],
        summary:
          'They are testing interpersonal judgement under pressure. Strong answers are specific, fair, and end with an outcome. Weak answers blame or stay abstract.',
      };
    case 'ambition':
      return {
        mustCover: [
          'A direction in five years — craft, leadership, or domain — not a title shopping list',
          ctx.jd
            ? `How ${ctx.role} at ${ctx.company} is a credible step`
            : 'How this kind of role is a credible step on that path',
          'What you would be better at then than you are now',
        ],
        strongSignals: [
          'Realistic growth, not “your job in 18 months”',
          'Tied to work you already do on the CV',
          'Curiosity about the team’s problems, not only your ladder',
        ],
        weakSignals: [
          '“I don’t know” with no attempt',
          'CEO / Head of Design with no path',
          'Only money or prestige',
        ],
        summary:
          'They want ambition they can believe. Strong answers name a direction and how this role feeds it. Weak answers are blank or fantasy.',
      };
    case 'ai':
      return {
        mustCover: [
          'Say what AI did vs what you still did yourself',
          'How you judged whether the output was good enough',
          `Ground it in real work (e.g. ${truncate(ctx.project, 40)})`,
        ],
        strongSignals: [
          'A concrete tool or workflow, not “we use AI”',
          'A place you refused AI because users or craft needed a human',
          'How you checked for bias, nonsense, or shallow UX',
        ],
        weakSignals: [
          '“AI will replace research” with no caveat',
          'Tool-name dropping with no judgement',
          'No example from your work or a hypothetical with no stakes',
        ],
        summary:
          'Strong AI answers show judgement: what you automate, what you keep human, and how you check the output. Weak answers are hype or avoidance.',
      };
    case 'jd_fit':
      return {
        mustCover: [
          ctx.jdReq
            ? `Show the requirement: ${truncate(ctx.jdReq, 70)}`
            : `Show fit for ${ctx.role} at ${ctx.company}`,
          `Use a CV example (e.g. ${truncate(ctx.project, 40)})`,
          'Name the problem, what you did, and what changed',
        ],
        strongSignals: [
          'Language that matches the JD without parroting it',
          `Specific tools/methods from your CV (e.g. ${ctx.skill})`,
          'Tradeoffs named explicitly',
        ],
        weakSignals: [
          'Generic claims with no project',
          `Ignoring what ${ctx.company} asked for`,
          'Tool laundry list with no outcome',
        ],
        summary: `They are testing whether you can do ${ctx.role} at ${ctx.company}. Map one CV story onto the spec. Do not invent a different job.`,
      };
    case 'stakeholder':
      return {
        mustCover: [
          'The pressure (timeline, PM, or exec) vs the user evidence you had',
          'What you proposed instead of a silent yes or a stubborn no',
          'How it landed — shipped, delayed, or a smaller test',
        ],
        strongSignals: [
          'You protected users without making the PM the villain',
          'A smaller experiment or scoped MVP as the compromise',
          'Clear ownership of the recommendation',
        ],
        weakSignals: [
          'Always say yes to stakeholders',
          'Always say no and call it “being user-centred”',
          'No example, only a philosophy',
        ],
        summary:
          'This is the room under stress: someone wants to ship. Strong answers show backbone and a path forward. Weak answers are slogans.',
      };
    case 'horizon':
      return {
        mustCover: [
          'What you would learn first (users, product, team)',
          'What you would make in the first 90 days',
          'How you would know it was working',
        ],
        strongSignals: [
          'Listening before a big redesign',
          'A concrete artifact: audit, prototype, or research plan',
          ctx.jd
            ? `Tied to ${ctx.company} / ${ctx.role}`
            : 'Tied to how you already work with PMs and engineers',
        ],
        weakSignals: [
          '“I’d redesign everything” in week one',
          'No mention of users or the existing team',
          'Vague “hit the ground running”',
        ],
        summary:
          'They want a grown-up 90-day picture: learn, make, measure. Weak answers are a revolution with no diagnosis.',
      };
    default:
      return {
        mustCover: [
          'Name the problem and who it was for',
          'Explain at least one option you considered and why you shipped this',
          'Include one concrete artifact, metric, or timeline',
          `Connect it to CV work (e.g. ${truncate(ctx.project, 40)})`,
        ],
        strongSignals: [
          'STAR-like structure: situation → actions → outcome',
          `Specific tools/methods from your CV (e.g. ${ctx.skill})`,
          'Tradeoffs named explicitly (“we chose X over Y because…”)',
        ],
        weakSignals: [
          'Generic claims with no project (“I always put users first”)',
          'Skipping the problem and jumping straight to UI',
          'Answer under ~45 seconds / very few specifics',
        ],
        summary:
          'Walk a real project: problem, options, decision, outcome. Specifics beat slogans.',
      };
  }
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
