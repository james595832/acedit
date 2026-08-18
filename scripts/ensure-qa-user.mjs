/**
 * Create or refresh the shared manual QA account.
 *
 * Credentials live only in .env.local (gitignored):
 *   QA_TEST_EMAIL
 *   QA_TEST_PASSWORD
 *
 * Usage: npm run qa:ensure-user
 *
 * Flags:
 *   --reset-password  rotate password and rewrite QA_TEST_PASSWORD in .env.local
 *   --trial-days=N    trial length (default 60)
 */
import {randomBytes} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');
if (!existsSync(envPath)) {
  console.error('Missing .env.local — copy .env.example and add Supabase keys first.');
  process.exit(1);
}

function parseEnv(raw) {
  const out = {};
  for (const line of raw.split('\n')) {
    if (!line || line.trimStart().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function setEnvKey(raw, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(raw)) return raw.replace(re, line);
  const trimmed = raw.replace(/\s*$/, '');
  return `${trimmed}\n\n# Shared manual QA login (do not commit)\n${line}\n`;
}

const args = new Set(process.argv.slice(2));
const resetPassword = args.has('--reset-password');
const trialDaysArg = [...args].find(a => a.startsWith('--trial-days='));
const trialDays = Math.min(
  Math.max(Number(trialDaysArg?.split('=')[1] ?? 60) || 60, 1),
  365,
);

let envRaw = readFileSync(envPath, 'utf8');
const env = parseEnv(envRaw);

const base = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_KEY;
if (!base || !serviceKey) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const email = env.QA_TEST_EMAIL || 'qa-manual@acedit.app';
let password = env.QA_TEST_PASSWORD;
if (!password || resetPassword) {
  password = `AcedQa-${randomBytes(9).toString('base64url')}!`;
  envRaw = setEnvKey(envRaw, 'QA_TEST_EMAIL', email);
  envRaw = setEnvKey(envRaw, 'QA_TEST_PASSWORD', password);
  writeFileSync(envPath, envRaw);
  console.log(resetPassword ? 'Rotated password in .env.local' : 'Wrote QA credentials to .env.local');
} else if (!env.QA_TEST_EMAIL) {
  envRaw = setEnvKey(envRaw, 'QA_TEST_EMAIL', email);
  writeFileSync(envPath, envRaw);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
};

async function listUsers() {
  const users = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(
      `${base}/auth/v1/admin/users?page=${page}&per_page=200`,
      {headers},
    );
    if (!res.ok) {
      throw new Error(`list users failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < 200) break;
  }
  return users;
}

const users = await listUsers();
let user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

if (!user) {
  const createRes = await fetch(`${base}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Jane QA',
        given_name: 'Jane',
        qa_manual: true,
      },
    }),
  });
  if (!createRes.ok) {
    console.error('create user failed:', createRes.status, await createRes.text());
    process.exit(1);
  }
  user = await createRes.json();
  console.log('Created QA user', user.id);
} else {
  const updateRes = await fetch(`${base}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...(user.user_metadata ?? {}),
        full_name: 'Jane QA',
        given_name: 'Jane',
        qa_manual: true,
      },
    }),
  });
  if (!updateRes.ok) {
    console.error('update user failed:', updateRes.status, await updateRes.text());
    process.exit(1);
  }
  user = await updateRes.json();
  console.log('Refreshed QA user', user.id);
}

const trialEnds = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
const patchRes = await fetch(`${base}/rest/v1/profiles?id=eq.${user.id}`, {
  method: 'PATCH',
  headers: {
    ...headers,
    Prefer: 'return=minimal',
  },
  body: JSON.stringify({
    email,
    full_name: 'Jane QA',
    subscription_status: 'trialing',
    subscription_tier: 'pro',
    trial_ends_at: trialEnds,
  }),
});

if (!patchRes.ok) {
  console.error('profile patch failed:', patchRes.status, await patchRes.text());
  process.exit(1);
}

console.log(`Pro trial set for ${trialDays} days (ends ${trialEnds.slice(0, 10)})`);
console.log('');
console.log('Sign in at /login with:');
console.log(`  email:    ${email}`);
console.log('  password: (QA_TEST_PASSWORD in .env.local)');
console.log('');
console.log('Do not commit .env.local. Share credentials only via a password manager.');
