#!/usr/bin/env node
/**
 * HTTP smoke tests — run while dev server is up (default http://127.0.0.1:3000).
 * Usage: node scripts/smoke-http.mjs [baseUrl]
 */
const base = process.argv[2] ?? process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';

const PUBLIC_PAGES = [
  '/',
  '/login',
  '/signup',
  '/privacy',
  '/terms',
  '/contact',
  '/portfolio',
  '/interview',
  '/studio',
];

const PROTECTED_APIS = [
  {path: '/api/portfolio/analyse', method: 'POST', body: {pasted_text: 'test'}},
  {path: '/api/interview/start', method: 'POST', body: {cv_id: 'fake'}},
  {path: '/api/cv/upload', method: 'POST', body: null, isForm: true},
];

const PUBLIC_APIS = [
  {
    path: '/api/feedback',
    method: 'POST',
    body: {
      category: 'feature',
      message: 'Automated smoke test — please ignore this feedback entry.',
      email: 'smoke-test@acedit.local',
      _hp: '',
    },
    expectStatus: 200,
  },
];

let passed = 0;
let failed = 0;

function fail(msg) {
  failed += 1;
  console.error(`  ✗ ${msg}`);
}

function pass(msg) {
  passed += 1;
  console.log(`  ✓ ${msg}`);
}

async function fetchStatus(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {...init, signal: controller.signal});
    return res;
  } finally {
    clearTimeout(timer);
  }
}

console.log(`\nSmoke tests → ${base}\n`);

for (const path of PUBLIC_PAGES) {
  try {
    const res = await fetchStatus(`${base}${path}`, {redirect: 'manual'});
    if (path === '/studio' || path === '/interview' || path === '/portfolio') {
      if (res.status === 200 || res.status === 307 || res.status === 308) {
        pass(`${path} → ${res.status} (auth redirect or OK)`);
      } else {
        fail(`${path} → expected 200/307, got ${res.status}`);
      }
    } else if (res.status >= 200 && res.status < 400) {
      pass(`${path} → ${res.status}`);
    } else {
      fail(`${path} → ${res.status}`);
    }
  } catch (error) {
    fail(`${path} → ${error instanceof Error ? error.message : 'fetch failed'}`);
  }
}

for (const api of PROTECTED_APIS) {
  try {
    let init = {method: api.method};
    if (api.isForm) {
      const form = new FormData();
      init = {...init, body: form};
    } else if (api.body) {
      init = {
        ...init,
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(api.body),
      };
    }
    const res = await fetchStatus(`${base}${api.path}`, init);
    if (res.status === 401) {
      pass(`${api.path} → 401 when unauthenticated`);
    } else {
      fail(`${api.path} → expected 401, got ${res.status}`);
    }
  } catch (error) {
    fail(`${api.path} → ${error instanceof Error ? error.message : 'fetch failed'}`);
  }
}

for (const api of PUBLIC_APIS) {
  try {
    const res = await fetchStatus(`${base}${api.path}`, {
      method: api.method,
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(api.body),
    });
    if (res.status === api.expectStatus) {
      pass(`${api.path} → ${res.status} (public feedback)`);
    } else {
      fail(`${api.path} → expected ${api.expectStatus}, got ${res.status}`);
    }
  } catch (error) {
    fail(`${api.path} → ${error instanceof Error ? error.message : 'fetch failed'}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
