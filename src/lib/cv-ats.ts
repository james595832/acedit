/**
 * Heuristic ATS-style audit — mimics what many parsers struggle with:
 * extractable text, contact blocks, standard headings, dates, and layout noise.
 */

export type AtsFlagSeverity = 'critical' | 'warning' | 'info' | 'pass';

export type AtsFlag = {
  id: string;
  severity: AtsFlagSeverity;
  title: string;
  detail: string;
  fix: string;
};

export type AtsAuditResult = {
  score: number;
  readiness: 'poor' | 'fair' | 'good' | 'strong';
  summary: string;
  flags: AtsFlag[];
  stats: {
    charCount: number;
    wordCount: number;
    pageCount: number | null;
    charsPerPage: number | null;
    sectionsFound: string[];
    hasEmail: boolean;
    hasPhone: boolean;
    hasLinkedIn: boolean;
  };
};

const SECTION_PATTERNS: Array<{id: string; label: string; pattern: RegExp}> = [
  {id: 'experience', label: 'Experience', pattern: /\b(experience|employment|work history|professional experience)\b/i},
  {id: 'education', label: 'Education', pattern: /\b(education|qualifications|degree|university|college)\b/i},
  {id: 'skills', label: 'Skills', pattern: /\b(skills|tools|technologies|competencies|expertise)\b/i},
  {id: 'summary', label: 'Summary', pattern: /\b(summary|profile|about me|professional summary)\b/i},
  {id: 'projects', label: 'Projects', pattern: /\b(projects|portfolio|selected work|case stud)/i},
];

const DESIGN_TOOL_PATTERN =
  /\b(figma|sketch|framer|protopie|principle|adobe xd|design system|ux research|usability testing|prototyping)\b/i;

const DATE_PATTERN =
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b|\b\d{1,2}\/\d{4}\b|\b(20\d{2}|19\d{2})\s*[-–—]\s*(20\d{2}|19\d{2}|present|current)\b/i;

function flag(
  id: string,
  severity: AtsFlagSeverity,
  title: string,
  detail: string,
  fix: string,
): AtsFlag {
  return {id, severity, title, detail, fix};
}

function scoreFromFlags(flags: AtsFlag[]): number {
  let score = 100;
  for (const f of flags) {
    if (f.severity === 'critical') score -= 28;
    else if (f.severity === 'warning') score -= 12;
    else if (f.severity === 'info') score -= 4;
  }
  return Math.max(0, Math.min(100, score));
}

function readinessFromScore(score: number): AtsAuditResult['readiness'] {
  if (score >= 82) return 'strong';
  if (score >= 68) return 'good';
  if (score >= 45) return 'fair';
  return 'poor';
}

function detectColumnNoise(lines: string[]): boolean {
  if (lines.length < 12) return false;
  const shortLines = lines.filter(
    (l) => l.split(/\s+/).length <= 3 && l.length > 0 && l.length < 28,
  );
  return shortLines.length / lines.length > 0.32;
}

function detectRepeatedHeader(lines: string[]): boolean {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const key = line.toLowerCase().trim();
    if (key.length < 4 || key.length > 40) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].some((n) => n >= 3);
}

export function auditCvForAts(input: {
  text: string;
  fileName: string;
  fileSizeBytes: number;
  pageCount?: number | null;
}): AtsAuditResult {
  const text = input.text.trim();
  const charCount = text.length;
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const pageCount = input.pageCount ?? null;
  const charsPerPage =
    pageCount && pageCount > 0 ? Math.round(charCount / pageCount) : null;

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const lower = text.toLowerCase();
  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
  const hasPhone =
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}\b/.test(
      text,
    );
  const hasLinkedIn = /\blinkedin\.com\b/i.test(text);

  const sectionsFound = SECTION_PATTERNS.filter(({pattern}) =>
    pattern.test(text),
  ).map(({label}) => label);

  const flags: AtsFlag[] = [];

  if (charCount === 0) {
    flags.push(
      flag(
        'no-text',
        'critical',
        'No readable text found',
        'This PDF looks image-only or heavily graphical. Most ATS parsers will see a blank file.',
        'Export a text-based PDF from Word, Google Docs, or Figma (not a flattened screenshot).',
      ),
    );
  } else if (charCount < 180) {
    flags.push(
      flag(
        'tiny-text',
        'critical',
        'Very little text extracted',
        `Only ${charCount} characters were readable. ATS and recruiters may miss your experience entirely.`,
        'Re-export your CV as a selectable PDF, or paste content into a simple single-column template.',
      ),
    );
  } else {
    flags.push(
      flag(
        'text-ok',
        'pass',
        'Text is extractable',
        'We could read your CV like a typical ATS would. A good baseline.',
        'Keep using a text-based PDF for applications.',
      ),
    );
  }

  if (charsPerPage !== null && charsPerPage < 350 && charCount > 0) {
    flags.push(
      flag(
        'low-density',
        'warning',
        'Low text per page',
        `~${charsPerPage} characters per page often means columns, graphics, or image blocks confused the parser.`,
        'Try a single-column layout with body copy as real text, not icons or text baked into images.',
      ),
    );
  }

  if (detectColumnNoise(lines)) {
    flags.push(
      flag(
        'column-noise',
        'warning',
        'Possible multi-column layout',
        'Lots of short fragmented lines. Common when two-column CVs get read out of order by ATS.',
        'Switch to one column for applications, or put critical details (role, company, dates) on their own lines.',
      ),
    );
  }

  if (detectRepeatedHeader(lines)) {
    flags.push(
      flag(
        'repeated-header',
        'info',
        'Repeated lines detected',
        'The same phrase appears multiple times. Often page headers or footers that ATS may duplicate or drop.',
        'Remove running headers/footers from the application version of your CV.',
      ),
    );
  }

  if (!hasEmail) {
    flags.push(
      flag(
        'no-email',
        'warning',
        'No email address detected',
        'Most ATS workflows match candidates by email. Missing contact info can break tracking.',
        'Add a plain-text email near the top (not inside an icon or image).',
      ),
    );
  } else {
    flags.push(
      flag(
        'email-ok',
        'pass',
        'Email found',
        'Contact email is readable as plain text.',
        'No change needed.',
      ),
    );
  }

  if (!hasPhone) {
    flags.push(
      flag(
        'no-phone',
        'info',
        'No phone number detected',
        'Optional for many design roles, but some ATS forms expect one.',
        'Add a phone line if you are open to recruiter calls.',
      ),
    );
  }

  if (!hasLinkedIn) {
    flags.push(
      flag(
        'no-linkedin',
        'info',
        'No LinkedIn URL detected',
        'Recruiters often cross-check profiles. A full linkedin.com/in/… URL parses best.',
        'Add your LinkedIn as plain text, not only as a hyperlink icon.',
      ),
    );
  }

  if (!sectionsFound.some((s) => s === 'Experience')) {
    flags.push(
      flag(
        'no-experience-heading',
        'warning',
        'No “Experience” section heading',
        'ATS and screeners look for standard headings. Custom titles like “My journey” may not map cleanly.',
        'Use clear headings: Experience, Skills, Education, Projects.',
      ),
    );
  }

  if (!sectionsFound.some((s) => s === 'Skills')) {
    flags.push(
      flag(
        'no-skills-heading',
        'warning',
        'No “Skills” section heading',
        'Keyword matching often relies on a dedicated skills block. Easy to miss in design CVs.',
        'Add a Skills or Tools section with Figma, research methods, etc. as text.',
      ),
    );
  }

  if (sectionsFound.length >= 3) {
    flags.push(
      flag(
        'sections-ok',
        'pass',
        'Standard sections detected',
        `Found: ${sectionsFound.join(', ')}.`,
        'Keep headings conventional for ATS submissions.',
      ),
    );
  }

  if (charCount > 0 && !DATE_PATTERN.test(text)) {
    flags.push(
      flag(
        'no-dates',
        'warning',
        'No clear employment dates',
        'ATS timelines usually need dates (like Jan 2022 to Present).',
        'Add month/year or year ranges for each role.',
      ),
    );
  }

  if (charCount > 0 && !DESIGN_TOOL_PATTERN.test(lower)) {
    flags.push(
      flag(
        'no-design-keywords',
        'info',
        'Few design-tool keywords',
        'No obvious Figma, research, or prototyping terms. Keyword filters may rank you lower for design roles.',
        'Spell out tools and methods in text (not only logos).',
      ),
    );
  }

  if (input.fileSizeBytes > 2 * 1024 * 1024) {
    flags.push(
      flag(
        'large-file',
        'info',
        'Large PDF file',
        'Files over ~2MB sometimes fail upload limits or slow ATS ingestion.',
        'Compress images and export without embedded portfolio spreads if possible.',
      ),
    );
  }

  if (/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F]/.test(text.replace(/[•●▪◦–—]/g, ''))) {
    flags.push(
      flag(
        'special-chars',
        'info',
        'Unusual characters detected',
        'Icons, custom glyphs, or emoji may not survive every ATS.',
        'Use standard bullets and ASCII punctuation in your application PDF.',
      ),
    );
  }

  const severityOrder: Record<AtsFlagSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    pass: 3,
  };

  flags.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  const score = scoreFromFlags(flags);
  const readiness = readinessFromScore(score);

  const summary =
    readiness === 'strong'
      ? 'Strong ATS readability. Your CV should parse cleanly for most systems.'
      : readiness === 'good'
        ? 'Mostly ATS-friendly. A few tweaks will reduce parsing risk.'
        : readiness === 'fair'
          ? 'Mixed ATS readiness. Fix warnings before mass-applying.'
          : 'High risk for ATS. Re-export or simplify layout before applying.';

  return {
    score,
    readiness,
    summary,
    flags,
    stats: {
      charCount,
      wordCount,
      pageCount,
      charsPerPage,
      sectionsFound,
      hasEmail,
      hasPhone,
      hasLinkedIn,
    },
  };
}
