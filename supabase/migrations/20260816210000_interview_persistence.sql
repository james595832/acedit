-- Interview persistence for hosted/prod (CV, JD, sessions).
-- Required because serverless hosts cannot write the local .data/ JSON store.

CREATE TABLE IF NOT EXISTS job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  file_name TEXT,
  file_url TEXT,
  raw_text TEXT NOT NULL,
  role_title TEXT,
  company_name TEXT,
  requirements TEXT[] DEFAULT '{}',
  responsibilities TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_user
  ON job_descriptions (user_id);

ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS job_description_id UUID REFERENCES job_descriptions(id);

ALTER TABLE interview_questions
  ADD COLUMN IF NOT EXISTS criteria_json TEXT;

CREATE INDEX IF NOT EXISTS idx_interview_sessions_cv
  ON interview_sessions (cv_id)
  WHERE cv_id IS NOT NULL;
