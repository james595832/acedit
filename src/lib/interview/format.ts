import type {JobDescriptionAnalysis} from '@/lib/criteria';

const WHITEBOARD_JD_PATTERNS: Array<{id: string; pattern: RegExp; label: string}> =
  [
    {id: 'whiteboard', pattern: /\bwhite\s*board\b/i, label: 'whiteboard'},
    {
      id: 'design-challenge',
      pattern: /\bdesign challenge\b/i,
      label: 'design challenge',
    },
    {id: 'case-study', pattern: /\bcase study\b/i, label: 'case study'},
    {
      id: 'live-exercise',
      pattern: /\blive (?:design )?(?:exercise|session|challenge)\b/i,
      label: 'live design exercise',
    },
    {
      id: 'onsite',
      pattern: /\bon[- ]site design\b/i,
      label: 'on-site design',
    },
    {
      id: 'presentation',
      pattern: /\bpresent (?:a|your) (?:case|portfolio|design)\b/i,
      label: 'case presentation',
    },
    {
      id: 'collab-session',
      pattern: /\bcollaborative design session\b/i,
      label: 'collaborative design session',
    },
    {
      id: 'app-exercise',
      pattern: /\bapp(?:lication)? exercise\b/i,
      label: 'app exercise',
    },
  ];

export type WhiteboardRecommendation = {
  recommended: boolean;
  reason: string | null;
  matchedTerms: string[];
};

export function recommendWhiteboardFromJd(
  jd: JobDescriptionAnalysis | null,
): WhiteboardRecommendation {
  if (!jd?.raw_text?.trim()) {
    return {recommended: false, reason: null, matchedTerms: []};
  }

  const haystack = [
    jd.raw_text,
    jd.role_title ?? '',
    ...jd.requirements,
    ...jd.responsibilities,
  ].join('\n');

  const matchedTerms = WHITEBOARD_JD_PATTERNS.filter(({pattern}) =>
    pattern.test(haystack),
  ).map(({label}) => label);

  if (matchedTerms.length === 0) {
    return {recommended: false, reason: null, matchedTerms: []};
  }

  const role = jd.role_title ? ` for ${jd.role_title}` : '';
  return {
    recommended: true,
    matchedTerms,
    reason: `This JD${role} mentions ${matchedTerms.slice(0, 2).join(' / ')} — practice on the timed whiteboard, not only verbal Q&A.`,
  };
}
