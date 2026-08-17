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
6. **SQL Editor** — run migration files in order:
   - `supabase/migrations/20260727180000_init.sql`
   - `supabase/migrations/20260727193000_auth_profile_trigger.sql`
   - `supabase/migrations/20260728210000_stripe_billing.sql`
   - `supabase/migrations/20260729230000_marketing_consent.sql`
   - `supabase/migrations/20260730220000_protect_billing_columns.sql`
   - `supabase/migrations/20260816210000_interview_persistence.sql` (JD table + session columns for hosted deploys)
   - `supabase/migrations/20260816223000_whiteboard_sessions.sql` (whiteboard runs + sketches for hosted deploys)
7. Open `/signup`, create an account, then `/login`.
8. **Shared QA login (recommended for ongoing testing):**

```bash
npm run qa:ensure-user
```

This creates/refreshes `qa-manual@acedit.app` (or `QA_TEST_EMAIL`), writes the password to `.env.local`, and grants a Pro trial. Details in `user-testing/README.md`. Never commit those credentials.

Once those env vars are set, `/interview` requires a signed-in user. Without them, the app stays open in local stub mode.

## Stripe billing (trial + cancel)

Flow: **Start free trial** → create account → Stripe Checkout → Studio. Cancel from **Settings**.

**Local setup (no Stripe CLI needed):**

1. Test mode ON in Stripe.
2. Create product + monthly price → copy `price_…` → `STRIPE_PRICE_ID_PRO`.
3. Copy **Test** secret key `sk_test_…` → `STRIPE_SECRET_KEY`.
4. Run billing SQL in Supabase SQL Editor:
   - `20260728210000_stripe_billing.sql`
   - `20260730220000_protect_billing_columns.sql` (locks billing columns to service role)
5. Set `SUPABASE_SERVICE_KEY` (service_role) — required for Stripe → profile sync.
6. Enable Customer portal (Settings → Billing → Customer portal) with cancel + update card.
7. Set `NEXT_PUBLIC_APP_URL` to your real origin (add preview URLs via `ALLOWED_APP_ORIGINS` if needed).
8. Restart `npm run dev` and try the trial flow with card `4242 4242 4242 4242`.

`STRIPE_WEBHOOK_SECRET` is optional locally — membership syncs when Checkout / Portal returns you to the app. **Required in production** for cancel / payment-failure sync.

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
