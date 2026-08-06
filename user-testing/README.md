# Synthetic user testing

Use Jane, Tony, and Brandon as **paths through the product** to verify that ACED-IT works, fails loudly where it shouldn’t, explains itself, and holds together as an offer.

## What we are testing
1. **System correctness** — flows complete; no silent failures
2. **Feature coverage** — Studio, Practice, Results, Portfolio, Whiteboard, auth, billing, feedback
3. **Instruction & context** — a new user knows what to do and why
4. **Product coherence** — marketing, product jobs, scoring, and pricing feel like one product

Persona voice is useful for spotting level-specific gaps. It is not the goal.

| Persona | Path through the product | Folder |
| --- | --- | --- |
| **Jane Okonkwo** | First-time graduate; thin CV; junior JD | `personas/jane/` |
| **Tony Reyes** | Working IC; stretch senior JD; whiteboard | `personas/tony/` |
| **Brandon Hale** | Leadership JD; portfolio + credibility of offer | `personas/brandon/` |

Each folder has:
- `profile.md` — who they are (inputs + likely blind spots)
- `cv.txt` / `cv.pdf` — uploadable CV
- `jd.txt` — target job description to paste
- `test-script.md` — ordered QA path + capture template

## Ask for a run

In Cursor chat:
- “Run Jane’s QA walkthrough on localhost. Focus on failures and missing instructions.”
- “Have Tony exercise Practice → Results → Whiteboard and report every break.”
- “Have Brandon check leadership path vs marketing coherence.”
- “Run all three personas and merge into one system health report.”

Follow `AGENT_PROMPT.md`. The project skill `synthetic-user-test` also triggers this workflow.

## Generate CV PDFs

```bash
npm run personas:pdf
```

## Manual run
1. Throwaway account.
2. Upload persona `cv.pdf`, paste `jd.txt`.
3. Follow `test-script.md`.
4. Log Pass / Fail / Partial and severity: blocker · broken · gap · coherence · polish.

## Rules
- Fictional people only. No real candidate data.
- Throwaway emails.
- Do not commit secrets.