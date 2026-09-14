const GENERIC = new Set([
  'and',
  'the',
  'for',
  'with',
  'you',
  'our',
  'role',
  'work',
  'team',
  'design',
  'designer',
  'experience',
  'strong',
  'ability',
  'skills',
  'etc',
  'including',
  'using',
  'plus',
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/[\s,/|;]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2 && !GENERIC.has(part));
}

function mentionedInCv(needle: string, cvBlob: string): boolean {
  const words = tokens(needle);
  if (!words.length) return true;
  const hit = words.filter((word) => cvBlob.includes(word)).length;
  return hit >= Math.min(2, words.length);
}

/** JD asks that the CV does not clearly show. */
export function findCvJdGaps(input: {
  cvText?: string | null;
  skills?: string[];
  requirements?: string[];
  keywords?: string[];
}): string[] {
  const cvBlob = `${input.cvText ?? ''} ${(input.skills ?? []).join(' ')}`.toLowerCase();
  const candidates = [
    ...(input.requirements ?? []),
    ...(input.keywords ?? []),
  ]
    .map((item) => item.trim())
    .filter((item) => item.length > 3 && item.length < 80);

  const gaps: string[] = [];
  const seen = new Set<string>();
  for (const item of candidates) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    if (mentionedInCv(item, cvBlob)) continue;
    seen.add(key);
    gaps.push(item);
    if (gaps.length >= 3) break;
  }
  return gaps;
}
