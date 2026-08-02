import type {CvAnalysis} from '@/lib/cv-parse';

function evidenceHit(answerLower: string, target: string): boolean {
  const tokens = target
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .split(/[^a-z0-9+/]+/)
    .filter((t) => t.length > 3)
    .slice(0, 5);
  if (tokens.length === 0) return false;
  const hits = tokens.filter((t) => answerLower.includes(t)).length;
  return hits >= Math.min(2, tokens.length);
}

/** Targets the candidate should cite from their CV on personal questions. */
export function buildCvEvidenceTargets(cv: CvAnalysis): string[] {
  const targets = [
    ...cv.projects.slice(0, 4),
    ...cv.companies.slice(0, 3),
    ...cv.roles.slice(0, 2),
  ];
  return [...new Set(targets.map((t) => t.trim()).filter(Boolean))];
}

export function evaluateCvEvidence(input: {
  transcription: string;
  cv: CvAnalysis;
  isPersonal: boolean;
}): {hit: string[]; missed: string[]} {
  const lower = input.transcription.trim().toLowerCase();
  if (!lower) {
    const targets = input.isPersonal ? buildCvEvidenceTargets(input.cv) : [];
    return {hit: [], missed: targets};
  }

  const targets = input.isPersonal
    ? buildCvEvidenceTargets(input.cv)
    : input.cv.companies.slice(0, 2);

  const hit = targets.filter((item) => evidenceHit(lower, item));
  const missed = targets.filter((item) => !evidenceHit(lower, item));
  return {hit, missed};
}
