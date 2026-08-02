import type {GeneratedQuestion, QuestionCategory} from '@/lib/types';
import {
  buildAnswerCriteria,
  type JobDescriptionAnalysis,
} from '@/lib/criteria';

export type CvAnalysis = {
  parsed_text: string;
  skills_extracted: string[];
  experience_years: number | null;
  projects: string[];
  companies: string[];
  roles: string[];
};

const SKILL_LEXICON = [
  'Figma',
  'Sketch',
  'Adobe XD',
  'Framer',
  'Principle',
  'Protopie',
  'UX Research',
  'User Research',
  'Usability Testing',
  'Design Systems',
  'Design System',
  'Interaction Design',
  'Visual Design',
  'Service Design',
  'Information Architecture',
  'Wireframing',
  'Prototyping',
  'Accessibility',
  'WCAG',
  'HTML',
  'CSS',
  'JavaScript',
  'React',
  'Product Design',
  'UX Design',
  'UI Design',
  'UX/UI',
  'Journey Mapping',
  'Persona',
  'A/B Testing',
  'Notion',
  'Miro',
  'FigJam',
  'Zeplin',
  'Storybook',
] as const;

export async function extractPdfText(bytes: Buffer): Promise<string> {
  const result = await extractPdfContent(bytes);
  return result.text;
}

export type PdfExtractResult = {
  text: string;
  pageCount: number | null;
};

export async function extractPdfContent(bytes: Buffer): Promise<PdfExtractResult> {
  const mod = (await import('pdf-parse')) as unknown as {
    PDFParse?: new (opts: {data: Buffer}) => {
      getText: () => Promise<{text: string}>;
      getInfo?: () => Promise<{pages?: unknown[]; total?: number}>;
      destroy?: () => Promise<void>;
    };
    default?: (data: Buffer) => Promise<{text: string; numpages?: number}>;
  };

  if (typeof mod.PDFParse === 'function') {
    const parser = new mod.PDFParse({data: bytes});
    try {
      const result = await parser.getText();
      let pageCount: number | null = null;
      try {
        const info = await parser.getInfo?.();
        if (Array.isArray(info?.pages)) {
          pageCount = info.pages.length;
        } else if (typeof info?.total === 'number') {
          pageCount = info.total;
        }
      } catch {
        pageCount = null;
      }
      return {
        text: cleanCvText(result.text ?? ''),
        pageCount,
      };
    } finally {
      await parser.destroy?.();
    }
  }

  if (typeof mod.default === 'function') {
    const result = await mod.default(bytes);
    return {
      text: cleanCvText(result.text ?? ''),
      pageCount: result.numpages ?? null,
    };
  }

  throw new Error('pdf-parse API not recognized');
}

function cleanCvText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function analyzeCvLocally(parsedText: string): CvAnalysis {
  const text = parsedText || '';
  const lower = text.toLowerCase();

  const skills_extracted = SKILL_LEXICON.filter((skill) =>
    lower.includes(skill.toLowerCase()),
  );

  const yearMatches = [...text.matchAll(/\b(20\d{2}|19\d{2})\b/g)].map((m) =>
    Number(m[1]),
  );
  let experience_years: number | null = null;
  if (yearMatches.length >= 2) {
    const min = Math.min(...yearMatches);
    const max = Math.max(...yearMatches, new Date().getFullYear());
    experience_years = Math.max(1, Math.min(40, max - min));
  } else {
    const explicit = text.match(/(\d+)\+?\s*\+?\s*years?/i);
    if (explicit) experience_years = Number(explicit[1]);
  }

  const projects = extractLabeledItems(text, [
    /projects?/i,
    /selected work/i,
    /case stud(?:y|ies)/i,
    /portfolio/i,
  ]).slice(0, 6);

  const companies = extractCompanies(text).slice(0, 6);
  const roles = extractRoles(text).slice(0, 6);

  return {
    parsed_text: text.slice(0, 12000),
    skills_extracted:
      skills_extracted.length > 0
        ? skills_extracted
        : ['Product Design', 'UX/UI Design'],
    experience_years,
    projects,
    companies,
    roles,
  };
}

function extractLabeledItems(text: string, headers: RegExp[]): string[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const items: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (headers.some((h) => h.test(line)) && line.length < 40) {
      inSection = true;
      continue;
    }
    if (inSection) {
      if (/^(experience|education|skills|awards|contact)\b/i.test(line)) {
        break;
      }
      if (line.length > 3 && line.length < 90) {
        items.push(line.replace(/^[-•*]\s*/, ''));
      }
      if (items.length >= 6) break;
    }
  }

  // Fallback: title-ish lines with design verbs
  if (items.length === 0) {
    for (const line of lines) {
      if (
        /designed|redesigned|led|launched|built|shipped/i.test(line) &&
        line.length < 100
      ) {
        items.push(line);
      }
      if (items.length >= 4) break;
    }
  }

  return unique(items);
}

function extractCompanies(text: string): string[] {
  const patterns = [
    /\b(?:at|@)\s+([A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.']+){0,3})/g,
    /\b([A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.']+){0,2})\s[-–—]\s*(?:Product|UX|UI|Design)/g,
  ];
  const found: string[] = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const name = match[1]?.trim();
      if (name && name.length > 2 && name.length < 40) found.push(name);
    }
  }
  return unique(found);
}

function extractRoles(text: string): string[] {
  const rolePattern =
    /\b((?:Senior |Staff |Lead |Principal |Junior )?(?:Product|UX|UI|Visual|Interaction|Service|Graphic) Designer|Design Lead|Head of Design|Design Manager)\b/gi;
  const found: string[] = [];
  for (const match of text.matchAll(rolePattern)) {
    found.push(match[1]);
  }
  return unique(found);
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

export function buildQuestionsFromCv(
  analysis: CvAnalysis,
  jd: JobDescriptionAnalysis | null = null,
): GeneratedQuestion[] {
  const skill = analysis.skills_extracted[0] ?? 'your core design craft';
  const skill2 = analysis.skills_extracted[1] ?? 'prototyping';
  const project = analysis.projects[0] ?? 'a recent project from your CV';
  const project2 = analysis.projects[1] ?? 'another piece of work on your CV';
  const company =
    jd?.company_name ?? analysis.companies[0] ?? 'your most recent company';
  const role = jd?.role_title ?? analysis.roles[0] ?? 'your current role';
  const years = analysis.experience_years
    ? `${analysis.experience_years} years`
    : 'your experience level';
  const jdFocus =
    jd?.requirements[0] ??
    jd?.keywords[0] ??
    'the priorities in the job description';

  const draft: Array<Omit<GeneratedQuestion, 'criteria'> & {is_personal: boolean}> =
    [
      {
        text: `Walk me through “${truncate(project, 60)}” end-to-end. How did you define the problem, explore options, and decide what to ship?`,
        category: 'ux_process',
        is_personal: true,
      },
      {
        text: `Your CV highlights ${skill}. Tell me about a decision where ${skill} materially changed the outcome — what alternatives did you reject?`,
        category: 'design_thinking',
        is_personal: true,
      },
      {
        text: jd
          ? `This role at ${company} asks for ${truncate(String(jdFocus), 70)}. Using a CV example, how have you demonstrated that?`
          : `At ${company} as ${role}, how did you handle a conflict between stakeholder requests and user evidence?`,
        category: 'communication',
        is_personal: true,
      },
      {
        text: `Looking at “${truncate(project2, 60)}”, what would you do differently with two more weeks? Be specific about craft and process.`,
        category: 'ux_process',
        is_personal: true,
      },
      {
        text: `With roughly ${years} on your CV, how has your collaboration model with engineers and PMs evolved?`,
        category: 'communication',
        is_personal: false,
      },
      {
        text: jd
          ? `For ${role}, describe how you would approach the first 90 days — what would you learn, make, and measure?`
          : `Describe how you would use ${skill2} when redesigning a dense enterprise form without losing data completeness.`,
        category: 'interaction',
        is_personal: Boolean(jd),
      },
      {
        text: 'Tell me about a time accessibility constraints changed your visual or interaction design.',
        category: 'visual_design',
        is_personal: false,
      },
      {
        text: jd
          ? `Whiteboard for ${company}: design a flow that addresses “${truncate(String(jdFocus), 60)}”. Talk through users, states, and success metrics.`
          : 'Whiteboard: design a portfolio review flow for hiring managers screening junior designers. Talk through IA, states, and success metrics.',
        category: 'whiteboard',
        is_personal: Boolean(jd),
      },
    ];

  return draft.map((q) => ({
    ...q,
    criteria: buildAnswerCriteria({
      questionText: q.text,
      category: q.category,
      isPersonal: q.is_personal,
      cv: analysis,
      jd,
    }),
  }));
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function categoryLabel(category: QuestionCategory): string {
  return category.replaceAll('_', ' ');
}
