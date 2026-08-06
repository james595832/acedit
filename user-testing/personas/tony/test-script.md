# Tony — QA walkthrough

**Objective:** Prove a working designer can run Practice with a stretch senior JD, get Results, and use Whiteboard without failures. Catch scoring/context gaps on seniority.

Base URL: `http://localhost:3001` or `https://acedit.app`

Fixtures:
- CV: `cv.pdf`
- JD paste: `jd.txt` (senior role)
- Throwaway email only

## Coverage path
1. **Landing → auth** — Entry and account access work.
2. **Studio** — Primary action obvious; secondary features reachable.
3. **Practice + stretch JD** — CV + senior JD accepted; questions feel JD-aware or clearly say if not.
4. **Answering / grading** — Full loop works; failures surface clearly.
5. **Results** — Breakdown readable; improvement guidance present; no broken session links.
6. **Portfolio** — Paste fallback works if URL scrape fails; messaging honest.
7. **Whiteboard** — Start challenge, draw/note, clarifying Q, end/review path.
8. **Settings / billing smoke** — Page loads; membership state intelligible.
9. **Feedback** — Submit works.

## For every step record
| Field | Value |
| --- | --- |
| Result | Pass / Fail / Partial |
| Severity | blocker · broken · gap · coherence · polish |
| Evidence | URL, UI text, error message |
| Missing context? | What instruction was absent |

## Tony-specific watchouts
- Does the product explain how JD changes scoring?
- Are senior-bar expectations stated before he answers?
- Any feature that looks available but is a dead end?

## Done when
Practice → Results → Whiteboard are verified working, with a clear list of breaks and missing instructions.