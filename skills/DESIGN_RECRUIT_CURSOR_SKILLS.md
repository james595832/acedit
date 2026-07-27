# Design Recruitment MVP - Cursor Skills & Prompts

## Quick Start Prompt for Cursor

When starting a new feature, use this:

```
@codebase 
You're building a design recruitment interview prep app on Next.js + Vercel + Supabase.

Architecture:
- Frontend: /app (Next.js App Router, React components in /components)
- API: /app/api (serverless functions)
- Database: Supabase PostgreSQL
- External: Anthropic API for CV analysis + question generation, Deepgram for voice transcription

Current task: [YOUR TASK]

Reference database schema at _schema.md and API patterns at _api_patterns.md in this repo.
Use TypeScript. Implement error handling and auth checks on every endpoint.
```

---

## Database Schema (Supabase)

```sql
-- Users table (extends Supabase auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  subscription_tier TEXT DEFAULT 'free', -- free, pro, premium
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CVs & documents
CREATE TABLE cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL, -- Vercel Blob URL
  file_name TEXT NOT NULL,
  parsed_text TEXT, -- Extracted CV text for analysis
  skills_extracted TEXT[], -- Array of detected skills
  experience_years INT,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Design-specific research & notes (user fills this)
CREATE TABLE candidate_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT,
  role_title TEXT,
  research_notes TEXT, -- User's job hunting notes
  portfolio_links TEXT[], -- URLs to user's work
  company_values TEXT,
  team_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview sessions
CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cv_id UUID REFERENCES cvs(id),
  interview_type TEXT, -- 'practice', 'faang_stage_1', etc
  stage_number INT DEFAULT 1,
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, paused
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  overall_score DECIMAL(5,2),
  feedback TEXT, -- JSON array of question scores + feedback
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview questions (could be from template or AI-generated)
CREATE TABLE interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INT,
  question_category TEXT, -- process, design_thinking, whiteboard, etc
  is_personal BOOLEAN DEFAULT FALSE, -- TRUE if generated from user's CV
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User answers to questions
CREATE TABLE user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  audio_url TEXT, -- Vercel Blob URL to recorded answer
  transcription TEXT, -- From Deepgram
  answer_text TEXT, -- Cleaned transcript
  score DECIMAL(5,2), -- 0-100
  feedback TEXT, -- AI-generated feedback
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generic + common design interview questions (seed these)
CREATE TABLE question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  category TEXT, -- ux_process, interaction, visual, whiteboard, etc
  difficulty INT, -- 1-5
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_interviews_user ON interview_sessions(user_id);
CREATE INDEX idx_answers_user ON user_answers(user_id);
CREATE INDEX idx_cvs_user ON cvs(user_id);
```

---

## API Endpoints & Patterns

### 1. CV Upload & Analysis

**POST /api/cv/upload**
```typescript
Request: FormData with file
Response: { cv_id: string, parsed_text: string, skills: string[] }

Flow:
1. Validate file (PDF only, <10MB)
2. Upload to Vercel Blob
3. Call Anthropic to extract text + skills from PDF
4. Store in DB + return cv_id
```

**Cursor prompt for this:**
```
Build the CV upload endpoint at /app/api/cv/upload.

Requirements:
- Accept PDF file only (validate MIME type and extension)
- Upload file to Vercel Blob Storage
- Use Anthropic API with claude-opus-4.8 to:
  - Extract full text
  - Detect design skills (list as array: ["UX/UI Design", "Figma", "Adobe XD", ...])
  - Estimate years of experience
- Store results in supabase.profiles[cv_id]
- Return { cv_id, parsed_text, skills, experience_years }
- Handle errors: file too large, invalid PDF, API failures
```

### 2. Question Generation (Personal + Generic)

**POST /api/interview/questions-generate**
```typescript
Request: { cv_id: string, company?: string, role?: string }
Response: { questions: Array<{ text, category, is_personal }> }

Flow:
1. Fetch user's CV (parsed_text)
2. Fetch user's company research if available
3. Call Anthropic to generate 8-10 design-specific questions:
   - 3-4 personal (based on CV work)
   - 2-3 company-specific (if research provided)
   - 2-3 generic design fundamentals
4. Return as array with metadata
```

**Cursor prompt:**
```
Build /app/api/interview/questions-generate.

For each generated question:
- Mark is_personal = true if it references user's CV project
- Include category: "ux_process", "visual_design", "interaction", "whiteboard", "communication"

Prompt to send Anthropic (claude-opus-4.8):
"You are a design interview coach. Generate exactly 8-10 interview questions for a design candidate.

Candidate CV summary: [cv_text truncated to 500 chars]
[Optional] Company: [company], Role: [role]
[Optional] Research: [research_notes]

Return ONLY valid JSON:
{
  \"questions\": [
    {\"text\": \"question here\", \"category\": \"ux_process\", \"is_personal\": true},
    ...
  ]
}

Personal questions should reference specific projects/skills from their CV. Generic ones test design fundamentals."

Handle JSON parsing errors gracefully.
```

### 3. Start Interview Session

**POST /api/interview/start**
```typescript
Request: { cv_id: string, interview_type: 'practice' | 'faang_stage_1' }
Response: { session_id: string, first_question: string }

Flow:
1. Create interview_sessions record
2. Generate (or fetch) questions
3. Create interview_questions records
4. Return session_id + first question text
```

### 4. Record Answer & Get Transcription

**POST /api/interview/answer-record**
```typescript
Request: FormData with audio blob, question_id, session_id
Response: { transcription: string, answer_id: string }

Flow:
1. Upload audio to Vercel Blob
2. Call Deepgram API to transcribe
3. Store transcription + audio URL in user_answers
4. Return transcription to frontend
```

**Cursor prompt:**
```
Build /app/api/interview/answer-record.

Steps:
1. Accept audio/webm or audio/mp3 (max 30MB)
2. Upload to Vercel Blob Storage with naming: sessions/{session_id}/{question_order}.webm
3. Call Deepgram API (DEEPGRAM_API_KEY env var):
   - Use model: "nova-2"
   - Return { result: { results: [ { alternatives: [{ transcript }] }] } }
4. Parse transcription from response
5. Store in user_answers with audio_url + transcription
6. Return { transcription, answer_id }

Environment vars needed:
- DEEPGRAM_API_KEY (https://console.deepgram.com)
- NEXT_PUBLIC_VERCEL_BLOB_READ_WRITE_TOKEN
```

### 5. Grade Answer & Provide Feedback

**POST /api/interview/grade-answer**
```typescript
Request: { answer_id: string, question_id: string }
Response: { score: number, feedback: string }

Flow:
1. Fetch question text + answer transcription
2. Call Anthropic to grade:
   - Score 0-100 based on design thinking, communication, specificity
   - Provide constructive feedback
3. Store score + feedback
4. Return to frontend
```

**Cursor prompt:**
```
Build /app/api/interview/grade-answer.

Anthropic prompt (claude-opus-4.8):
"You are a senior design interview evaluator.

Question: [question_text]
Candidate's answer: [transcription]

Evaluate on:
1. Design thinking (do they explain their process?)
2. Communication clarity (can you follow their reasoning?)
3. Depth (specific examples or generic platitudes?)
4. Design knowledge (correct terminology, awareness of best practices?)

Return ONLY JSON:
{
  \"score\": 72,
  \"scoreBreakdown\": {
    \"designThinking\": 8,
    \"communication\": 7,
    \"depth\": 6,
    \"knowledge\": 8
  },
  \"feedback\": \"You explained your process clearly, but could have included more specific examples from your Figma files. Consider mentioning accessibility considerations or user testing insights next time.\",
  \"strengths\": [\"Clear communication\", \"Structured thinking\"],
  \"improvements\": [\"More specific examples\", \"Consider edge cases\"]
}

Score should be 0-100. Feedback should be 1-2 sentences, actionable."

Parse JSON response, handle errors.
```

### 6. Get Interview Results

**GET /api/interview/results/:sessionId**
```typescript
Response: {
  session_id: string,
  overall_score: number,
  questions: Array<{
    question_text: string,
    category: string,
    score: number,
    feedback: string,
    transcription: string
  }>
}
```

---

## Frontend Component Structure

```
/app
  /interview
    page.tsx (upload CV or start new interview)
    /start
      page.tsx (question displayed, record button)
    /results
      page.tsx (show all scores + feedback)
  /components
    CVUploadForm.tsx (accepts PDF, shows parsing status)
    InterviewQuestion.tsx (displays question, record button, transcript)
    AnswerPlayback.tsx (play audio + show transcript)
    ResultsCard.tsx (single Q+A with score)
    ResultsSummary.tsx (overall score + graphs)
    VoiceRecorder.tsx (useMediaRecorder hook, blob handling)
```

### Key Hook: useVoiceRecorder

```typescript
// Needed for voice interview UI
const {
  isRecording,
  transcript,
  startRecording,
  stopRecording,
  audioBlob,
} = useVoiceRecorder({
  onTranscribeComplete: (text) => handleSubmitAnswer(text),
});

// Must handle:
// - MediaRecorder browser API (audio/webm)
// - Countdown timer display
// - Stop on 2 min limit
// - Show waveform visualization (optional)
```

---

## Environment Variables (.env.local)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Deepgram
DEEPGRAM_API_KEY=your-key

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Stripe (later)
NEXT_PUBLIC_STRIPE_PK=pk_test_...
STRIPE_SK=sk_test_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Cursor-Specific Build Commands

### Prompt 1: New feature scaffolding
```
@codebase @files
Create a new feature [FEATURE_NAME].

Structure:
- /app/[feature]/page.tsx (entry point)
- /app/api/[feature]/route.ts (API endpoint)
- /components/[Feature].tsx (React component)
- Database migration (if needed)

Use TypeScript strict mode. Export types from /lib/types.ts.
```

### Prompt 2: Supabase migration
```
@codebase
Create a Supabase migration file for:
[DESCRIBE TABLE/SCHEMA CHANGE]

File should go in: /supabase/migrations/[timestamp]_[name].sql
Add indexes for common queries.
Include rollback logic (DROP TABLE IF EXISTS with CASCADE).
```

### Prompt 3: API error handling
```
@codebase
Add proper error handling to /app/api/[endpoint]/route.ts:

- 400 for validation errors (specific field messages)
- 401 for auth failures
- 500 for Anthropic/Deepgram API failures
- Log all errors to console + (later: Sentry)
- Return structured { error: string, code: string } JSON
```

### Prompt 4: Connect to Figma MCP
```
When creating design components via Cursor:
- Link Figma file in comments: // Figma: https://figma.com/file/[ID]
- Use Figma colors as CSS variables where possible
- Reference component dimensions from Figma specs in JIRA/comments
- @figma mcp can pull latest Figma docs if needed
```

---

## Testing Strategy (Cursor Code Generation)

### Unit test template:
```typescript
// /app/api/cv/upload.test.ts
describe('POST /api/cv/upload', () => {
  it('should extract text and skills from PDF', async () => {
    // Mock Anthropic response
    // Mock Supabase insert
    // Call endpoint with FormData
    // Assert response shape
  });
});
```

Use Cursor to generate these with:
```
@codebase
Generate Jest tests for /app/api/cv/upload covering:
- Valid PDF upload
- Invalid file type (rejected)
- PDF parsing failure (API error)
- Database insert failure

Mock Anthropic API and Supabase.
```

---

## Deployment Checklist (Vercel)

- [ ] Environment variables configured in Vercel dashboard
- [ ] Supabase migrations applied to production DB
- [ ] CORS headers set (if calling external APIs)
- [ ] Rate limiting on /api/interview/answer-record (to prevent spam)
- [ ] Blob storage paths are read-only for users (signed URLs)
- [ ] Test CV upload → grade flow end-to-end
- [ ] Stripe test transaction (when ready)

---

## Git Workflow with Cursor

```bash
# Start new feature
git checkout -b feature/cv-upload
# Use Cursor with prompts above
git add .
git commit -m "feat: add CV upload and parsing"

# Test on localhost
npm run dev

# Deploy preview
git push origin feature/cv-upload
# Vercel auto-deploys preview

# Merge to main
git pull origin main
git merge feature/cv-upload
git push origin main
# Vercel auto-deploys production
```

---

## Common Cursor Patterns

### "Refactor this API route into smaller functions"
```
@codebase
Refactor /app/api/interview/grade-answer into:
- lib/anthropic/gradeAnswer.ts (core logic)
- lib/database/storeGrade.ts (DB write)
- /app/api/interview/grade-answer/route.ts (API handler only)

Each function should:
- Have clear inputs/outputs
- Be testable in isolation
- Include error handling
- Have JSDoc comments
```

### "Generate types from database schema"
```
@codebase
Generate TypeScript types for all Supabase tables in /lib/types.ts.

Each type should:
- Extend from Supabase auto-generated types
- Include enums for TEXT fields (subscription_tier, interview_type, status)
- Export as named exports
- Reference in all API handlers
```

### "Add authentication to all endpoints"
```
@codebase
Add Supabase auth checks to every API endpoint in /app/api/*.

Pattern:
1. Import { createClient } from '@supabase/supabase-js'
2. Verify JWT from request headers
3. Return 401 if missing/invalid
4. Extract user_id from decoded JWT
5. Pass user_id to database queries (don't trust client)
```

---

## Phase 1 MVP Feature Order (for Cursor builds)

1. **Auth setup** → Supabase auth + protected routes
2. **CV upload** → File handling + Anthropic parsing
3. **Question generation** → Template + AI hybrid
4. **Interview start** → Session creation
5. **Voice recorder** → Audio capture component
6. **Answer grading** → Anthropic scoring
7. **Results page** → Display scores + feedback
8. **Stripe integration** → Subscription check on endpoints

Each phase: 1-2 Cursor sessions per feature.

---

## Key References

- Figma file: [Insert link to your Figma design]
- Supabase docs: https://supabase.com/docs
- Anthropic API: https://docs.anthropic.com
- Deepgram: https://developers.deepgram.com
- Next.js: https://nextjs.org/docs

---

## Quick Debugging with Cursor

```
@codebase @errors
I'm getting [ERROR MESSAGE] when [DOING THIS].

Debug this by:
1. Adding console.logs to [FUNCTION]
2. Check environment variables
3. Test with a simpler payload
4. Print Anthropic/Deepgram response fully
```

