-- Three-round interview series: shared CV/JD plus stage unlock.

CREATE TABLE IF NOT EXISTS interview_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cv_id UUID REFERENCES cvs(id) ON DELETE SET NULL,
  job_description_id UUID REFERENCES job_descriptions(id) ON DELETE SET NULL,
  current_stage INT DEFAULT 1,
  process_stance TEXT,
  org_pace TEXT,
  company_url TEXT,
  target_track_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_series_user
  ON interview_series (user_id);

ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES interview_series(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_interview_sessions_series
  ON interview_sessions (series_id)
  WHERE series_id IS NOT NULL;

ALTER TABLE interview_questions
  ADD COLUMN IF NOT EXISTS persona TEXT;

ALTER TABLE interview_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own interview series" ON interview_series;
CREATE POLICY "Users can manage own interview series"
  ON interview_series
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
