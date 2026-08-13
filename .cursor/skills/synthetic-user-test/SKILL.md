---
name: synthetic-user-test
description: >-
  QA walkthrough of ACED-IT using Jane, Tony, or Brandon as synthetic users.
  Focuses on system failures, feature coverage, missing instructions, and
  product coherence. Use when the user asks to user-test, run a persona,
  check if the product works, or find broken flows.
---

# Synthetic user testing (QA)

## Objective
Verify the product, not the persona:

1. Does the system work as it should?
2. Where is it failing?
3. Do features work end to end?
4. Is instruction / context missing for a real user?
5. Is the offering coherent as a product?

## Setup
1. Read `user-testing/AGENT_PROMPT.md` (source of truth for method + report format).
2. Pick `user-testing/personas/{jane|tony|brandon}/`.
3. Read `profile.md`, `cv.txt`, `jd.txt`, `test-script.md`.
4. If `cv.pdf` is missing, run `npm run personas:pdf`.

## Execute
1. Local `http://localhost:3001` if available; else `https://acedit.app`.
2. Follow the test script as a **feature coverage path**.
3. Prefer real browser interaction; note console/network errors.
4. For each step: Pass / Fail / Partial + evidence.
5. Answer interview prompts at the persona’s skill level so grading is real.
6. Prefer shared QA login (`npm run qa:ensure-user` → `.env.local`). No real PII; never delete the shared QA account; no secrets in git.

## Severity
blocker · broken · gap · coherence · polish

## Report
Return Verdict, System & feature results, Failures, Missing context/instruction, Product coherence, Top fixes.
Prioritize bugs and blockers over persona colour commentary.
