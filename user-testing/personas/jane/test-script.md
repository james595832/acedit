# Jane — QA walkthrough

**Objective:** Prove a first-time graduate can complete core jobs without insider knowledge. Catch breaks, missing instructions, and offer confusion.

Base URL: `http://localhost:3001` or `https://acedit.app`

Fixtures:
- CV: `cv.pdf` (`npm run personas:pdf` if missing)
- JD paste: `jd.txt`
- Throwaway email only

## Coverage path
1. **Landing** — Promise clear? CTA works? Any broken links?
2. **Signup / trial** — Account creates; pricing/trial language understandable; errors handled.
3. **Sign-in** — Works; wrong-password state clear.
4. **Studio** — Knows the primary next action without guessing.
5. **Practice prep** — CV upload works; JD paste works; stepper/instructions enough to proceed.
6. **Practice session** — Questions generate; recording/transcript works; grading returns.
7. **Results** — Scores + feedback visible; next steps clear; no empty dead ends.
8. **Portfolio** — URL and/or paste path works; honest empty/failure states.
9. **Whiteboard (smoke)** — Can open a challenge; timer/canvas/chat do not hard-fail.
10. **Feedback + footer legal** — Feedback submits; Privacy/Terms/Contact load.

## For every step record
| Field | Value |
| --- | --- |
| Result | Pass / Fail / Partial |
| Severity | blocker · broken · gap · coherence · polish |
| Evidence | URL, UI text, error message |
| Missing context? | What instruction was absent |

## Jane-specific watchouts
- Jargon or senior assumptions on first visit
- Thin CV causing empty/odd grading without explanation
- Unclear what “strong answer” means before speaking

## Done when
You can say whether the graduate happy path is reliable, and list every break + instruction gap found.