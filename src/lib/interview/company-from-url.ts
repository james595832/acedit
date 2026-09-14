/** Host labels that are not the company name. */
const SKIP_LABELS = new Set([
  'www',
  'careers',
  'jobs',
  'job',
  'apply',
  'boards',
  'board',
  'gh',
  'app',
  'about',
  'team',
  'studio',
]);

function titleCaseLabel(label: string): string {
  if (!label) return '';
  if (label.length <= 3) return label.toUpperCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Company label from a careers / marketing URL. Does not fetch the page. */
export function companyNameFromUrl(
  raw?: string | null,
): string | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const withProtocol = /^https?:\/\//i.test(raw.trim())
      ? raw.trim()
      : `https://${raw.trim()}`;
    const host = new URL(withProtocol).hostname.replace(/^www\./i, '');
    const parts = host.split('.').filter(Boolean);
    if (!parts.length) return undefined;
    const named = parts.find((part) => !SKIP_LABELS.has(part.toLowerCase()));
    const label = named ?? parts[0];
    if (!label || SKIP_LABELS.has(label.toLowerCase())) return undefined;
    return titleCaseLabel(label);
  } catch {
    return undefined;
  }
}
