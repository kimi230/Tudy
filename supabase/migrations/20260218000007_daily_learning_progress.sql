-- Daily Learning Progress table
CREATE TABLE IF NOT EXISTS daily_learning_progress (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id          TEXT NOT NULL,
  next_segment_index INTEGER NOT NULL DEFAULT 0,
  total_segments    INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- RLS: users can only access their own data
ALTER TABLE daily_learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily progress"
  ON daily_learning_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily progress"
  ON daily_learning_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily progress"
  ON daily_learning_progress FOR UPDATE
  USING (auth.uid() = user_id);
