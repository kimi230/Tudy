-- 학습 세션
CREATE TABLE public.study_sessions (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  step_status JSONB NOT NULL DEFAULT '{}',
  cornell_notes JSONB NOT NULL DEFAULT '{}',
  marked_segments JSONB NOT NULL DEFAULT '[]',
  review_needed INTEGER[] NOT NULL DEFAULT '{}',
  self_score INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  total_study_time_sec INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (id, user_id)
);
CREATE INDEX idx_sessions_user_video ON public.study_sessions (user_id, video_id);

-- 오답노트
CREATE TABLE public.error_notes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  segment_index INTEGER NOT NULL,
  error_type TEXT NOT NULL,
  original_text TEXT NOT NULL,
  user_heard TEXT NOT NULL DEFAULT '',
  explanation TEXT NOT NULL DEFAULT '',
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_error_notes_user_video ON public.error_notes (user_id, video_id);

-- 딕테이션
CREATE TABLE public.dictation_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  segment_index INTEGER NOT NULL,
  user_input TEXT NOT NULL,
  correct_text TEXT NOT NULL,
  word_results JSONB NOT NULL DEFAULT '[]',
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dictation_user_video ON public.dictation_attempts (user_id, video_id);

-- 녹음 메타데이터 (오디오 파일은 Storage)
CREATE TABLE public.recordings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  segment_index INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  duration REAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 모든 테이블 RLS
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dictation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_data" ON public.study_sessions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_data" ON public.error_notes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_data" ON public.dictation_attempts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_data" ON public.recordings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
