import type {
  PortfolioAuditResult,
  PortfolioConfidence,
  PortfolioFlag,
  PortfolioFlagSeverity,
  PortfolioReadiness,
} from '@/lib/portfolio/types';

const CASE_STUDY_HEADERS = [
  /\bcase stud(?:y|ies)\b/i,
  /\bselected work\b/i,
  /\bprojects?\b/i,
  /\bwork\b/i,
  /\bportfolio\b/i,
];

const PROCESS_SIGNALS = [
  /\bresearch\b/i,
  /\buser interview/i,
  /\busability test/i,
  /\bprototype/i,
  /\bwireframe/i,
  /\biterat/i,
  /\bexplor/i,
  /\bdouble diamond\b/i,
  /\bjobs.to.be.done\b/i,
  /\bworkshop\b/i,
  /\bstakeholder/i,
  /\bhandoff\b/i,
  /\bfigma\b/i,
];

const METRIC_PATTERN =
  /\b\d+(?:\.\d+)?%|\b\d[\d,]*\+?\s*(?:users|customers|people|teams|markets|conversion|retention|revenue|signups|downloads)\b|\b(?:increased|reduced|improved|grew|cut|saved|raised)\s+(?:by\s+)?\d+/gi;

const ROLE_CLARITY = [
  /\bmy role\b/i,
  /\bi led\b/i,
  /\bi owned\b/i,
  /\bi was (?:the )?(?:lead|sole|primary)\b/i,
  /\bas (?:the )?(?:lead|senior|product) designer\b/i,
  /\bteam of \d+/i,
  /\bcollaborated with (?:engineers|pm|product)/i,
];

const PROBLEM_SIGNALS = [
  /\bproblem\b/i,
  /\bchallenge\b/i,
  /\bgoal\b/i,
  /\bobjective\b/i,
  /\buser need/i,
  /\bpain point/i,
  /\bopportunity\b/i,
];

const OUTCOME_SIGNALS = [
  /\boutcome/i,
  /\bresult/i,
  /\bimpact\b/i,
  /\blesson/i,
  /\bwhat (?:i )?learned\b/i,
  /\bshipped\b/i,
  /\blaunched\b/i,
];

function pFlag(
  id: string,
  severity: PortfolioFlagSeverity,
  title: string,
  detail: string,
  fix: string,
): PortfolioFlag {
  return {id, severity, title, detail, fix};
}

function countPatternHits(text: string, patterns: RegExp[]): number {
  return patterns.filter((re) => re.test(text)).length;
}

function countRegexMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].length;
}

/** Detect likely project / case study titles from line structure. */
export function detectCaseStudyTitles(text: string): string[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length >= 4 && l.length <= 90);

  const titles: string[] = [];
  let inWorkSection = false;

  for (const line of lines) {
    if (CASE_STUDY_HEADERS.some((h) => h.test(line)) && line.length < 35) {
      inWorkSection = true;
      continue;
    }
    if (/^(about|contact|skills|experience|education|footer)\b/i.test(line)) {
      inWorkSection = false;
    }

    const looksLikeTitle =
      /^[A-Z0-9][^.!?]{3,70}$/.test(line) &&
      !/^(the|and|for|with|your|our|we|i)\b/i.test(line) &&
      line.split(/\s+/).length <= 10;

    if (inWorkSection && looksLikeTitle) {
      titles.push(line);
    }
  }

  if (titles.length < 2) {
    for (const line of lines) {
      if (
        looksLikeHeading(line) &&
        !titles.includes(line) &&
        !CASE_STUDY_HEADERS.some((h) => h.test(line))
      ) {
        titles.push(line);
      }
    }
  }

  return [...new Set(titles)].slice(0, 8);
}

function looksLikeHeading(line: string): boolean {
  return (
    line.length >= 6 &&
    line.length <= 72 &&
    /^[A-Z]/.test(line) &&
    !line.endsWith('.') &&
    line.split(/\s+/).length <= 9 &&
    /\b(design|app|platform|product|system|bank|health|fintech|saas|mobile|web|dashboard|checkout|onboarding|brand|redesign|case)\b/i.test(
      line,
    )
  );
}

function scoreFromFlags(flags: PortfolioFlag[]): number {
  let score = 100;
  for (const f of flags) {
    if (f.severity === 'critical') score -= 22;
    else if (f.severity === 'warning') score -= 11;
    else if (f.severity === 'info') score -= 4;
  }
  return Math.max(0, Math.min(100, score));
}

function readinessFromScore(score: number): PortfolioReadiness {
  if (score >= 82) return 'strong';
  if (score >= 68) return 'good';
  if (score >= 48) return 'fair';
  return 'poor';
}

export function auditPortfolioHeuristic(input: {
  text: string;
  pageTitle: string | null;
  confidence: PortfolioConfidence;
}): PortfolioAuditResult {
  const text = input.text.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lower = text.toLowerCase();
  const caseStudies = detectCaseStudyTitles(text);
  const processSignals = countPatternHits(text, PROCESS_SIGNALS);
  const metricMentions = countRegexMatches(text, METRIC_PATTERN);
  const roleClaritySignals = countPatternHits(text, ROLE_CLARITY);
  const problemSignals = countPatternHits(text, PROBLEM_SIGNALS);
  const outcomeSignals = countPatternHits(text, OUTCOME_SIGNALS);

  const canScore = input.confidence !== 'insufficient' && input.confidence !== 'low';

  if (input.confidence === 'insufficient') {
    return {
      confidence: input.confidence,
      canScore: false,
      score: null,
      readiness: null,
      summary:
        'Not enough readable portfolio content to review. Use a public URL or paste case study copy.',
      flags: [],
      caseStudies: [],
      stats: {
        wordCount,
        caseStudyCount: 0,
        processSignals,
        metricMentions,
        roleClaritySignals,
        pageTitle: input.pageTitle,
      },
      llmNote: null,
    };
  }

  const flags: PortfolioFlag[] = [];

  if (caseStudies.length === 0) {
    flags.push(
      pFlag(
        'no-case-studies',
        'critical',
        'No clear case studies detected',
        'Recruiters scan for named projects with a story. We could not find distinct project titles.',
        'Add 2 or 3 case studies with clear titles (client or product name) on the page or in pasted text.',
      ),
    );
  } else if (caseStudies.length === 1) {
    flags.push(
      pFlag(
        'single-case',
        'warning',
        'Only one project surfaced',
        'One case study is thin for senior roles; hiring managers expect breadth.',
        'Add at least one more end-to-end project with a different problem type or domain.',
      ),
    );
  } else {
    flags.push(
      pFlag(
        'case-studies-found',
        'pass',
        'Case studies identified',
        `Spotted ${caseStudies.length} likely project${caseStudies.length === 1 ? '' : 's'}: ${caseStudies.slice(0, 3).join(', ')}.`,
        'Keep titles easy to scan. An outcome or domain in the headline helps.',
      ),
    );
  }

  if (problemSignals < 2) {
    flags.push(
      pFlag(
        'weak-problem-framing',
        'warning',
        'Problem framing is light',
        'Strong portfolios state the user problem, constraint, or business goal before showing UI.',
        'Open each case with who struggled, why it mattered, and what success looked like.',
      ),
    );
  }

  if (processSignals < 3) {
    flags.push(
      pFlag(
        'thin-process',
        'critical',
        'Design process is hard to see',
        'Little evidence of research, exploration, iteration, or collaboration. It reads like outcomes only.',
        'Show how you worked: research, options considered, tradeoffs, and what you shipped.',
      ),
    );
  } else if (processSignals >= 5) {
    flags.push(
      pFlag(
        'process-visible',
        'pass',
        'Process is visible',
        'Research, prototyping, or collaboration signals appear in the copy.',
        'Pair process with your specific role so it is clear what you led vs the team.',
      ),
    );
  }

  if (metricMentions === 0 && wordCount > 200) {
    flags.push(
      pFlag(
        'no-metrics',
        'warning',
        'No measurable outcomes',
        'No metrics, user counts, or before/after results. Hard to judge impact in a 30-second scan.',
        'Add 1 or 2 numbers you can defend in interview (% improvement, users, time saved, etc.).',
      ),
    );
  } else if (metricMentions >= 2) {
    flags.push(
      pFlag(
        'metrics-present',
        'pass',
        'Outcomes quantified',
        'Impact appears with numbers or clear results. Strong signal for recruiters.',
        'Ensure metrics tie to design decisions you made, not only team OKRs.',
      ),
    );
  }

  if (roleClaritySignals === 0 && wordCount > 250) {
    flags.push(
      pFlag(
        'unclear-role',
        'warning',
        'Your role is unclear',
        'Team credits are good, but reviewers need to know what you personally owned.',
        'Add “My role: …” with research, IA, UI, prototyping, stakeholder workshops, etc.',
      ),
    );
  }

  if (outcomeSignals < 2) {
    flags.push(
      pFlag(
        'weak-outcomes',
        'info',
        'Outcomes / learnings section is light',
        'Closing with results and reflections helps interviewers know what to ask you about.',
        'End each case with what shipped, what changed for users, and one thing you would redo.',
      ),
    );
  }

  if (/\b(lorem ipsum|placeholder|coming soon|under construction)\b/i.test(lower)) {
    flags.push(
      pFlag(
        'placeholder-copy',
        'critical',
        'Placeholder content detected',
        'Incomplete copy signals the portfolio is not ready to send.',
        'Replace placeholders before sharing with employers.',
      ),
    );
  }

  if (wordCount > 400 && !/\b(figma|sketch|prototype|wireframe|design system|ui|visual|interaction)\b/i.test(lower)) {
    flags.push(
      pFlag(
        'no-craft-signals',
        'info',
        'Craft / tooling not mentioned',
        'For design roles, reviewers expect hints of craft: tools, systems, or UI decisions.',
        'Mention artifacts: flows, components, prototypes, or accessibility choices.',
      ),
    );
  }

  flags.sort((a, b) => {
    const order = {critical: 0, warning: 1, info: 2, pass: 3};
    return order[a.severity] - order[b.severity];
  });

  const rawScore = scoreFromFlags(flags);
  const score =
    input.confidence === 'low'
      ? null
      : Math.round(rawScore * (input.confidence === 'medium' ? 0.92 : 1));

  const readiness =
    score === null ? null : readinessFromScore(score);

  const summary =
    !canScore && input.confidence === 'low'
      ? 'Partial read only. Paste full case study text for a score you can trust.'
      : readiness === 'strong'
        ? 'Portfolio reads interview-ready: clear projects, process, and evidence a hiring manager can probe.'
        : readiness === 'good'
          ? 'Solid foundation. A few gaps to fix before you apply to competitive roles.'
          : readiness === 'fair'
            ? 'Needs work. Recruiters may pass in a quick scan. Tighten story and evidence first.'
            : 'Not ready to send. Fix the critical gaps before applying.';

  return {
    confidence: input.confidence,
    canScore,
    score,
    readiness,
    summary,
    flags,
    caseStudies,
    stats: {
      wordCount,
      caseStudyCount: caseStudies.length,
      processSignals,
      metricMentions,
      roleClaritySignals,
      pageTitle: input.pageTitle,
    },
    llmNote: null,
  };
}
