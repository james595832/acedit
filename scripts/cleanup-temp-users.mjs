// Dev-only: delete throwaway design-check-* users created for screenshots.
import {readFileSync} from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

const base = env.NEXT_PUBLIC_SUPABASE_URL.trim();
const serviceKey = env.SUPABASE_SERVICE_KEY.trim();
const headers = {apikey: serviceKey, Authorization: `Bearer ${serviceKey}`};

const res = await fetch(`${base}/auth/v1/admin/users?per_page=100`, {headers});
const {users = []} = await res.json();
const targets = users.filter((u) => u.email?.startsWith('design-check-'));
for (const u of targets) {
  // Profile row (created by signup trigger) blocks auth-user deletion.
  const prof = await fetch(`${base}/rest/v1/profiles?id=eq.${u.id}`, {
    method: 'DELETE',
    headers,
  });
  const del = await fetch(`${base}/auth/v1/admin/users/${u.id}`, {
    method: 'DELETE',
    headers,
  });
  console.log(
    'delete',
    u.email,
    `profile:${prof.status}`,
    `user:${del.status}`,
    del.ok ? '' : await del.text(),
  );
}
console.log(`done (${targets.length} temp users)`);
