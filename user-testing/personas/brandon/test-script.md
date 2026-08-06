# Brandon — QA walkthrough

**Objective:** Prove leadership-path inputs work end to end, and check whether the product offer (marketing + in-app jobs + feedback) is coherent for someone evaluating design leadership prep.

Base URL: `http://localhost:3001` or `https://acedit.app`

Fixtures:
- CV: `cv.pdf`
- JD paste: `jd.txt` (Head of Design)
- Throwaway email only

## Coverage path
1. **Landing credibility** — Claims match what the app actually does; CTAs work.
2. **Auth + Studio** — Stable entry; home explains the product jobs.
3. **Practice + leadership JD** — Upload/paste works; questions/grading complete.
4. **Results quality of context** — Feedback explains criteria; not a blank or generic wall.
5. **Portfolio** — Paste path for case-study text works; scrape failure is explained.
6. **Whiteboard** — Session starts and can be completed/reviewed without crash.
7. **Settings / billing / legal** — Pages load; subscription story matches landing.
8. **Feedback** — Works.

## For every step record
| Field | Value |
| --- | --- |
| Result | Pass / Fail / Partial |
| Severity | blocker · broken · gap · coherence · polish |
| Evidence | URL, UI text, error message |
| Missing context? | What instruction was absent |

## Brandon-specific watchouts
- Does the product over-promise leadership prep it cannot deliver?
- Are IC-only assumptions hiding in instructions or rubrics?
- Would a skeptical lead trust the system enough to continue?

## Done when
Leadership path is verified for breaks, and coherence gaps between promise and product are listed with evidence.