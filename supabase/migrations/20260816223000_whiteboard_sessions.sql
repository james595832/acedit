-- Whiteboard practice persistence for hosted/prod.
-- Serverless hosts cannot write the local .data/whiteboard store.

CREATE TABLE IF NOT EXISTS whiteboard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  challenge_title TEXT NOT NULL,
  board_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  clarifying_used INT NOT NULL DEFAULT 0,
  score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  debrief_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sketch_png_base64 TEXT,
  has_sketch BOOLEAN NOT NULL DEFAULT FALSE,
  seconds_remaining INT NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whiteboard_sessions_user_created
  ON whiteboard_sessions (user_id, created_at DESC);
