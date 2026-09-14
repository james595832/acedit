import type {GeneratedQuestion, QuestionCategory} from '@/lib/types';
import {
  buildAnswerCriteria,
  inferQuestionKind,
  type JobDescriptionAnalysis,
} from '@/lib/criteria';
import {
  CLASSIC_OPENER_COUNT,
  INTERVIEW_QUESTION_COUNT,
} from '@/lib/interview/constants';
import {
  draftQuestionsForTrack,
  getTrack,
  parseDesignProcessStance,
  parseOrgPace,
  resolveInterviewTrack,
  type DesignProcessStance,
  type InterviewTrack,
  type OrgPace,
} from '@/lib/interview/tracks';
import {
  applyPracticeMemoryToQuestions,
  type PracticeMemory,
} from '@/lib/interview/practice-memory';

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
  'Claude',
  'ChatGPT',
  'Copilot',
  'Cursor',
  'Generative AI',
  'LLM',
] as const;

export async function extractPdfText(bytes: Buffer): Promise<string> {
  const result = await extractPdfContent(bytes);
  return result.text;
}

export type CvFileKind = 'pdf' | 'docx';

export type CvPageImage = {
  mime: 'image/png' | 'image/jpeg';
  base64: string;
};

export type CvExtractResult = {
  text: string;
  pageCount: number | null;
  kind: CvFileKind;
  /** True when selectable PDF text was empty/thin and we recovered copy via page OCR. */
  usedOcr: boolean;
  /** Page rasters for a vision fallback when OCR still yields little text. */
  pageImages: CvPageImage[];
};

export type PdfExtractResult = Omit<CvExtractResult, 'kind' | 'pageImages'> & {
  usedOcr: boolean;
};

/** Enough real copy to personalise questions. Below this we keep trying OCR/vision. */
export const MIN_USEFUL_CV_CHARS = 80;
const MIN_NATIVE_TEXT_CHARS = 180;

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function detectCvFileKind(
  fileName: string,
  mimeType?: string | null,
): CvFileKind | 'unsupported' {
  const lower = fileName.toLowerCase();
  const mime = (mimeType ?? '').toLowerCase();
  if (mime === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf';
  if (mime === DOCX_MIME || lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.doc')) return 'unsupported';
  return 'unsupported';
}

export async function extractCvDocument(
  fileName: string,
  mimeType: string | null,
  bytes: Buffer,
): Promise<CvExtractResult> {
  const kind = detectCvFileKind(fileName, mimeType);
  if (kind === 'docx') {
    const text = await extractDocxText(bytes);
    return {
      text,
      pageCount: null,
      kind: 'docx',
      usedOcr: false,
      pageImages: [],
    };
  }
  if (kind !== 'pdf') {
    throw new Error(
      'Use a PDF or Word (.docx) file. Old .doc files need to be saved as .docx first.',
    );
  }
  const pdf = await extractPdfContent(bytes);
  return {...pdf, kind: 'pdf'};
}

async function extractDocxText(bytes: Buffer): Promise<string> {
  const mammothMod = (await import('mammoth')) as {
    extractRawText?: (input: {buffer: Buffer}) => Promise<{value: string}>;
    default?: {
      extractRawText: (input: {buffer: Buffer}) => Promise<{value: string}>;
    };
  };
  const extract =
    mammothMod.extractRawText ?? mammothMod.default?.extractRawText;
  if (!extract) {
    throw new Error('Could not read Word document.');
  }
  const result = await extract({buffer: bytes});
  return cleanCvText(result.value ?? '');
}

type PdfParser = {
  getText: (opts?: {first?: number}) => Promise<{
    text: string;
    pages?: Array<{text?: string}>;
  }>;
  getInfo?: () => Promise<{pages?: unknown[]; total?: number}>;
  getScreenshot?: (opts?: {
    scale?: number;
    first?: number;
    imageBuffer?: boolean;
    imageDataUrl?: boolean;
  }) => Promise<{
    pages?: Array<{
      data?: Uint8Array | Buffer;
      dataUrl?: string;
      buffer?: Buffer;
    }>;
  }>;
  getImage?: (opts?: {
    first?: number;
    imageBuffer?: boolean;
    imageDataUrl?: boolean;
    imageThreshold?: number;
  }) => Promise<{
    pages?: Array<{
      images?: Array<{data?: Uint8Array; dataUrl?: string}>;
    }>;
  }>;
  destroy?: () => Promise<void>;
};

type PdfParseCtor = {
  new (opts: {data: Buffer; CanvasFactory?: unknown}): PdfParser;
  setWorker?: (src: string) => string;
};

export async function extractPdfContent(bytes: Buffer): Promise<CvExtractResult> {
  const data = new Uint8Array(bytes);

  let text = '';
  let pageCount: number | null = null;
  let extractError: string | null = null;

  try {
    const unpdf = await extractWithUnpdf(data);
    text = unpdf.text;
    pageCount = unpdf.pageCount;
  } catch (err) {
    extractError = err instanceof Error ? err.message : String(err);
    console.error('[cv-parse] unpdf extract failed', err);
  }

  if (text.length < MIN_NATIVE_TEXT_CHARS) {
    try {
      const parsed = await extractWithPdfParse(bytes);
      if (parsed.text.length > text.length) {
        text = parsed.text;
      }
      if (parsed.pageCount != null) pageCount = parsed.pageCount;
    } catch (err) {
      extractError = err instanceof Error ? err.message : String(err);
      console.error('[cv-parse] pdf-parse extract failed', err);
    }
  }

  let usedOcr = false;
  let pageImages: CvPageImage[] = [];

  if (text.length < MIN_NATIVE_TEXT_CHARS) {
    pageImages = await collectPdfPageImagesFromBytes(bytes);
    if (pageImages.length) {
      try {
        const ocrText = await ocrPageImages(pageImages);
        if (ocrText.length > text.length) {
          text = ocrText;
          usedOcr = true;
        }
      } catch (err) {
        console.error('[cv-parse] OCR fallback failed', err);
      }
    }
  }

  if (!text && extractError) {
    console.error('[cv-parse] no text extracted', extractError);
  }

  return {text, pageCount, kind: 'pdf', usedOcr, pageImages};
}

async function extractWithUnpdf(
  data: Uint8Array,
): Promise<{text: string; pageCount: number | null}> {
  const {extractText, getDocumentProxy} = await import('unpdf');
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, {mergePages: true});
  const raw = Array.isArray(result.text) ? result.text.join('\n\n') : result.text;
  return {
    text: cleanCvText(raw),
    pageCount: result.totalPages ?? null,
  };
}

async function extractWithPdfParse(
  bytes: Buffer,
): Promise<{text: string; pageCount: number | null}> {
  const worker = await import('pdf-parse/worker').catch((err) => {
    console.error('[cv-parse] pdf-parse worker unavailable', err);
    return null;
  });
  const mod = (await import('pdf-parse')) as unknown as {
    PDFParse?: PdfParseCtor;
  };
  if (typeof mod.PDFParse !== 'function') {
    throw new Error('pdf-parse PDFParse missing');
  }
  if (worker && typeof worker.getData === 'function') {
    mod.PDFParse.setWorker?.(worker.getData());
  } else if (worker && typeof worker.getPath === 'function') {
    mod.PDFParse.setWorker?.(worker.getPath());
  }

  const parser = new mod.PDFParse({
    data: bytes,
    ...(worker?.CanvasFactory ? {CanvasFactory: worker.CanvasFactory} : {}),
  });
  try {
    const result = await parser.getText();
    const fromPages = (result as {pages?: Array<{text?: string}>}).pages
      ?.map((page) => page.text ?? '')
      .join('\n\n');
    let pageCount: number | null = null;
    try {
      const info = await parser.getInfo?.();
      if (Array.isArray(info?.pages)) pageCount = info.pages.length;
      else if (typeof info?.total === 'number') pageCount = info.total;
    } catch {
      pageCount = null;
    }
    return {
      text: cleanCvText(result.text || fromPages || ''),
      pageCount,
    };
  } finally {
    await parser.destroy?.();
  }
}

async function collectPdfPageImagesFromBytes(bytes: Buffer): Promise<CvPageImage[]> {
  try {
    const worker = await import('pdf-parse/worker').catch(() => null);
    const mod = (await import('pdf-parse')) as unknown as {
      PDFParse?: PdfParseCtor;
    };
    if (typeof mod.PDFParse !== 'function') return [];
    if (worker && typeof worker.getData === 'function') {
      mod.PDFParse.setWorker?.(worker.getData());
    }
    const parser = new mod.PDFParse({
      data: bytes,
      ...(worker?.CanvasFactory ? {CanvasFactory: worker.CanvasFactory} : {}),
    });
    try {
      return await collectPdfPageImages(parser);
    } finally {
      await parser.destroy?.();
    }
  } catch (err) {
    console.error('[cv-parse] page raster failed', err);
    return [];
  }
}

async function collectPdfPageImages(parser: PdfParser): Promise<CvPageImage[]> {
  const images: CvPageImage[] = [];

  if (typeof parser.getScreenshot === 'function') {
    try {
      const shot = await parser.getScreenshot({
        scale: 1.6,
        first: 3,
        imageBuffer: true,
        imageDataUrl: true,
      });
      for (const page of shot.pages ?? []) {
        const parsed = pageImageFromRaw(page.dataUrl, page.data ?? page.buffer);
        if (parsed) images.push(parsed);
      }
    } catch (err) {
      console.error('[cv-parse] PDF screenshot failed', err);
    }
  }

  if (images.length === 0 && typeof parser.getImage === 'function') {
    try {
      const embedded = await parser.getImage({
        first: 3,
        imageBuffer: true,
        imageDataUrl: true,
        imageThreshold: 120,
      });
      for (const page of embedded.pages ?? []) {
        for (const image of page.images ?? []) {
          const parsed = pageImageFromRaw(image.dataUrl, image.data);
          if (parsed) images.push(parsed);
        }
      }
    } catch (err) {
      console.error('[cv-parse] PDF embedded image extract failed', err);
    }
  }

  return images.slice(0, 3);
}

function pageImageFromRaw(
  dataUrl?: string,
  raw?: Uint8Array | Buffer,
): CvPageImage | null {
  if (dataUrl?.startsWith('data:image/')) {
    const match = /^data:(image\/(?:png|jpeg));base64,(.+)$/i.exec(dataUrl);
    if (match?.[1] && match[2]) {
      return {
        mime: match[1].toLowerCase() === 'image/jpeg' ? 'image/jpeg' : 'image/png',
        base64: match[2],
      };
    }
  }
  if (raw && raw.byteLength > 80) {
    return {
      mime: 'image/png',
      base64: Buffer.from(raw).toString('base64'),
    };
  }
  return null;
}

async function ocrPageImages(images: CvPageImage[]): Promise<string> {
  const {ocrImageToText} = await import('@/lib/ocr');
  const chunks: string[] = [];
  for (const image of images) {
    const pageText = await ocrImageToText(Buffer.from(image.base64, 'base64'));
    if (pageText.trim()) chunks.push(pageText.trim());
  }
  return cleanCvText(chunks.join('\n\n'));
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
    textMentionsSkill(lower, skill),
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
    skills_extracted,
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
    /\b(?:AI |Senior |Staff |Lead |Principal |Junior )?(?:Product|UX|UI|Visual|Interaction|Service) Designer\s[-–—]\s+([A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.']+){0,3})/g,
    /\b(?:Product Design Intern|UX Design Intern|Design Intern)\s[-–—]\s+([A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.']+){0,3})/g,
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
    /\b((?:AI |Senior |Staff |Lead |Principal |Junior |Intern )?(?:Product|UX|UI|Visual|Interaction|Service|Graphic) Designer|UX Researcher|User Researcher|Art Director|Creative Director|Design Lead|Head of Design|Design Manager|VP(?:,?| of) Product Design)\b/gi;
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

export function cvUsesAi(analysis: CvAnalysis): boolean {
  const blob = [
    analysis.parsed_text,
    ...analysis.skills_extracted,
    ...analysis.roles,
    ...analysis.projects,
  ]
    .join(' ')
    .toLowerCase();
  return /\b(ai|llm|llms|claude|chatgpt|copilot|cursor|generative ai|machine learning|midjourney)\b/i.test(
    blob,
  );
}

export function buildQuestionsFromCv(
  analysis: CvAnalysis,
  jd: JobDescriptionAnalysis | null = null,
  track: InterviewTrack | null = null,
  process: DesignProcessStance = 'classic',
  orgPace: OrgPace = 'established',
  memory: PracticeMemory | null = null,
): GeneratedQuestion[] {
  const resolved =
    track ??
    resolveInterviewTrack({roleTitle: jd?.role_title}) ??
    getTrack('product_designer')!;
  const skill = analysis.skills_extracted[0] ?? 'your core design craft';
  const project = analysis.projects[0] ?? 'a recent project from your CV';
  const company =
    jd?.company_name ?? analysis.companies[0] ?? 'your most recent company';
  const role = jd?.role_title ?? resolved.label ?? analysis.roles[0] ?? 'your current role';
  const years = analysis.experience_years
    ? `${analysis.experience_years} years`
    : 'your experience level';
  const jdFocus =
    jd?.requirements[0] ??
    jd?.keywords[0] ??
    'the priorities in the job description';
  const jdWantsAi = Boolean(
    jd &&
      /\b(ai|llm|machine learning|copilot|chatgpt)\b/i.test(
        `${jd.raw_text} ${jd.requirements.join(' ')} ${jd.keywords.join(' ')}`,
      ),
  );

  const draft = draftQuestionsForTrack(resolved, {
    skill,
    project,
    company,
    role,
    years,
    jdFocus: String(jdFocus),
    hasCompany: Boolean(jd?.company_name),
    hasJd: Boolean(jd?.raw_text?.trim()),
    jdWantsAi,
    cvUsesAi: cvUsesAi(analysis),
    process: parseDesignProcessStance(process),
    orgPace: parseOrgPace(orgPace),
    companyBrief: jd?.company_brief ?? null,
    skillGaps: jd?.skill_gaps ?? [],
  });

  const mapped = draft.slice(0, INTERVIEW_QUESTION_COUNT).map((q) => ({
    text: q.text,
    category: q.category,
    is_personal: q.is_personal,
    criteria: buildAnswerCriteria({
      questionText: q.text,
      category: q.category,
      isPersonal: q.is_personal,
      cv: analysis,
      jd,
      kind: q.kind,
    }),
  }));
  return applyPracticeMemoryToQuestions(mapped, memory);
}

export function looksLikeClassicOpener(text: string): boolean {
  return /tell me about yourself|why (do you want|are you applying|this kind of|this intern)|what do you know about|strengths as a |dealt with a conflict|five years/i.test(
    text,
  );
}

export function assembleInterviewSet(
  analysis: CvAnalysis,
  jd: JobDescriptionAnalysis | null,
  llmQuestions?: GeneratedQuestion[] | null,
  track: InterviewTrack | null = null,
  process: DesignProcessStance = 'classic',
  orgPace: OrgPace = 'established',
  memory: PracticeMemory | null = null,
): GeneratedQuestion[] {
  const local = buildQuestionsFromCv(
    analysis,
    jd,
    track,
    process,
    orgPace,
    memory,
  );
  const classic = local.slice(0, CLASSIC_OPENER_COUNT);
  if (!llmQuestions?.length) return local;

  const withCriteria = llmQuestions.map((q) => ({
    ...q,
    criteria:
      q.criteria ??
      buildAnswerCriteria({
        questionText: q.text,
        category: q.category,
        isPersonal: q.is_personal,
        cv: analysis,
        jd,
        kind: inferQuestionKind(q.text),
      }),
  }));

  const cvFromLlm = withCriteria
    .filter((q) => !looksLikeClassicOpener(q.text))
    .slice(0, INTERVIEW_QUESTION_COUNT - CLASSIC_OPENER_COUNT);
  const cv =
    cvFromLlm.length >= 4
      ? ensureAiQuestion(
          cvFromLlm,
          analysis,
          jd,
          track,
          process,
          orgPace,
          memory,
        )
      : local.slice(CLASSIC_OPENER_COUNT);

  return [...classic, ...cv].slice(0, INTERVIEW_QUESTION_COUNT);
}

export function ensureAiQuestion(
  questions: GeneratedQuestion[],
  analysis: CvAnalysis,
  jd: JobDescriptionAnalysis | null,
  track: InterviewTrack | null = null,
  process: DesignProcessStance = 'classic',
  orgPace: OrgPace = 'established',
  memory: PracticeMemory | null = null,
): GeneratedQuestion[] {
  const limit = INTERVIEW_QUESTION_COUNT - CLASSIC_OPENER_COUNT;
  const trimmed = questions.slice(0, limit);
  if (trimmed.some((q) => /\bai\b/i.test(q.text))) return trimmed;
  const ai = buildQuestionsFromCv(
    analysis,
    jd,
    track,
    process,
    orgPace,
    memory,
  ).find(
    (q) => /\bai\b/i.test(q.text),
  );
  if (!ai) return trimmed;
  return [trimmed[0], ai, ...trimmed.slice(1)].filter(Boolean).slice(0, limit);
}

function textMentionsSkill(lowerText: string, skill: string): boolean {
  const needle = skill.toLowerCase();
  if (needle.length <= 3) {
    return new RegExp(`\\b${needle}\\b`, 'i').test(lowerText);
  }
  return lowerText.includes(needle);
}

export function categoryLabel(category: QuestionCategory): string {
  return category.replaceAll('_', ' ');
}
