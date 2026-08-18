function looksLikePersonName(value: string): boolean {
  const cleaned = value.trim();
  if (cleaned.length < 2) return false;
  if (/aced[\s_-]*it|acedit/i.test(cleaned)) return false;
  if (/^(qa|test|demo|user|admin)([\s._-]|$)/i.test(cleaned)) return false;
  if (/^\d+$/.test(cleaned)) return false;
  return true;
}

function formatFirstName(raw: string): string {
  const first = raw.trim().split(/[\s._+-]+/)[0] ?? '';
  if (!first || !looksLikePersonName(first)) return '';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Prefer a real given name; never greet with the product brand. */
export function resolveGreetingName(input: {
  profileName?: string | null;
  metaName?: string | null;
  givenName?: string | null;
  email?: string | null;
}): string {
  for (const candidate of [
    input.givenName,
    input.profileName,
    input.metaName,
  ]) {
    if (!candidate) continue;
    const formatted = formatFirstName(candidate);
    if (formatted) return formatted;
  }

  const local = input.email?.split('@')[0] ?? '';
  const fromEmail = formatFirstName(local);
  if (fromEmail) return fromEmail;

  return 'there';
}

export function daysAgoLabel(iso: string): string {
  const days = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}
