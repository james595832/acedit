-- Lock every public table so the public anon key cannot read everyone's data.
-- Service role (server) still bypasses RLS — the app keeps working.
-- Signed-in users may only touch their own rows.

-- ---------------------------------------------------------------------------
-- cvs
-- ---------------------------------------------------------------------------
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own cvs" ON public.cvs;
CREATE POLICY "Users can manage own cvs"
  ON public.cvs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- candidate_research
-- ---------------------------------------------------------------------------
ALTER TABLE public.candidate_research ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own candidate research" ON public.candidate_research;
CREATE POLICY "Users can manage own candidate research"
  ON public.candidate_research
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- job_descriptions
-- ---------------------------------------------------------------------------
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own job descriptions" ON public.job_descriptions;
CREATE POLICY "Users can manage own job descriptions"
  ON public.job_descriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- interview_sessions
-- ---------------------------------------------------------------------------
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own interview sessions" ON public.interview_sessions;
CREATE POLICY "Users can manage own interview sessions"
  ON public.interview_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- interview_questions (owned via parent session)
-- ---------------------------------------------------------------------------
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage questions for own sessions" ON public.interview_questions;
CREATE POLICY "Users can manage questions for own sessions"
  ON public.interview_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.interview_sessions s
      WHERE s.id = interview_questions.session_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.interview_sessions s
      WHERE s.id = interview_questions.session_id
        AND s.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- user_answers
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own answers" ON public.user_answers;
CREATE POLICY "Users can manage own answers"
  ON public.user_answers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- whiteboard_sessions
-- ---------------------------------------------------------------------------
ALTER TABLE public.whiteboard_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own whiteboard sessions" ON public.whiteboard_sessions;
CREATE POLICY "Users can manage own whiteboard sessions"
  ON public.whiteboard_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- question_bank (shared catalog — read if logged in; writes via service role only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read question bank" ON public.question_bank;
CREATE POLICY "Authenticated users can read question bank"
  ON public.question_bank
  FOR SELECT
  TO authenticated
  USING (true);
