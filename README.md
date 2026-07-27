# ACED-IT

Design interview prep — CV upload, voice practice, AI feedback.

## Stack

- Next.js App Router + TypeScript
- Astryx (`@astryxdesign/core` + custom warm editorial theme)
- Local JSON stubs by default (no paid keys required)
- Optional: Anthropic Haiku, Deepgram, Supabase free tiers

## Requirements

- Node.js **≥ 22.13** (Astryx CLI). This repo includes `.nvmrc`.

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use
```

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Auth (free)

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) (Free plan).
2. **Project Settings → API** — copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY` (server only)
3. Paste them into `.env.local` (restart `npm run dev` after saving).
4. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
5. **Authentication → Providers → Email** — enable Email. For fastest local testing, turn **off** “Confirm email”.
6. **SQL Editor** — run both files in order:
   - `supabase/migrations/20260727180000_init.sql`
   - `supabase/migrations/20260727193000_auth_profile_trigger.sql`
7. Open `/signup`, create an account, then `/login`.

Once those env vars are set, `/interview` requires a signed-in user. Without them, the app stays open in local stub mode.

## Astryx

```bash
npm run astryx -- component Button
npm run astryx -- build "interview results page"
npm run astryx -- docs theme
```

Agent conventions live in `AGENTS.md`. Theme source: `src/theme/aced-it/`.

## Cheap / stub mode

With `USE_STUBS=true` (default in `.env.example`):

- CV analysis, question generation, and grading return deterministic stub data
- Audio transcription returns a stub transcript
- Sessions/CVs/answers persist under `.data/`

When you add keys, set `USE_STUBS=false` and prefer:

| Service | Cheapest path |
| --- | --- |
| Anthropic | `claude-haiku-4-5-20251001` (override via `ANTHROPIC_MODEL`) |
| Deepgram | `nova-2` + free credit |
| Supabase | Free project + migration in `supabase/migrations/` |
| Blob | Skip; local `.data/uploads` until needed |

## Product docs

See `skills/DESIGN_RECRUIT_CURSOR_SKILLS.md` and `skills/design.MD`.
