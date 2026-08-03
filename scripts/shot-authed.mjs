// Dev-only: create a throwaway Supabase user via admin REST API, sign in
// through the UI, screenshot the gated app pages, then delete the user.
import {chromium} from 'playwright-core';
import {readFileSync} from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

const base = env.NEXT_PUBLIC_SUPABASE_URL.trim();
const serviceKey = env.SUPABASE_SERVICE_KEY.trim();
const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
};

const email = `design-check-${Date.now()}@example.com`;
const password = `Tmp-${Math.random().toString(36).slice(2)}-9x`;

const createRes = await fetch(`${base}/auth/v1/admin/users`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: {full_name: 'James Preview'},
  }),
});
if (!createRes.ok) {
  console.error('create user failed:', createRes.status, await createRes.text());
  process.exit(1);
}
const {id: userId} = await createRes.json();
console.log('created temp user');

try {
  const browser = await chromium.launch({channel: 'chrome'});
  const page = await browser.newPage({viewport: {width: 1280, height: 900}});
  await page.goto('http://localhost:3001/login', {waitUntil: 'networkidle'});
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', {name: /sign in/i}).click();
  await page.waitForURL(/studio|checkout/, {timeout: 20000}).catch(() => {});
  await page.waitForTimeout(1200);

  const shots = [
    ['/studio', '.shots/studio.png'],
    ['/interview', '.shots/interview.png'],
    ['/whiteboard', '.shots/whiteboard.png'],
    ['/interview/results', '.shots/results.png'],
    ['/portfolio', '.shots/portfolio.png'],
  ];
  for (const [path, out] of shots) {
    await page.goto(`http://localhost:3001${path}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(700);
    await page.screenshot({path: out, fullPage: true});
    console.log('saved', out);
  }
  await browser.close();
} finally {
  // Profile row (created by signup trigger) blocks auth-user deletion.
  await fetch(`${base}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'DELETE',
    headers,
  });
  const del = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers,
  });
  console.log('deleted temp user:', del.status);
}
