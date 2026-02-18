-- Video library tables for all languages (en/zh/ja)

CREATE TABLE IF NOT EXISTS public.video_catalog (
  language TEXT NOT NULL CHECK (language IN ('en', 'zh', 'ja')),
  video_id TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel TEXT NOT NULL,
  category_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  thumbnail TEXT NOT NULL DEFAULT '',
  speech_rate_wpm INTEGER NOT NULL DEFAULT 0,
  speech_rate_cpm INTEGER NOT NULL DEFAULT 0,
  speech_rate_mpm INTEGER NOT NULL DEFAULT 0,
  added_at DATE,
  segment_count INTEGER NOT NULL DEFAULT 0,
  vocabulary_count INTEGER NOT NULL DEFAULT 0,
  grammar_pattern_count INTEGER NOT NULL DEFAULT 0,
  description_ko TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (language, video_id)
);

CREATE INDEX IF NOT EXISTS idx_video_catalog_language_category
  ON public.video_catalog (language, category_id);

CREATE INDEX IF NOT EXISTS idx_video_catalog_language_added_at
  ON public.video_catalog (language, added_at DESC);

CREATE TABLE IF NOT EXISTS public.video_artifacts (
  language TEXT NOT NULL CHECK (language IN ('en', 'zh', 'ja')),
  video_id TEXT NOT NULL,
  meta JSONB NOT NULL,
  segments JSONB NOT NULL,
  vocabulary JSONB NOT NULL,
  grammar JSONB NOT NULL,
  connected_speech JSONB NOT NULL,
  structure JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (language, video_id),
  CONSTRAINT fk_video_artifacts_catalog
    FOREIGN KEY (language, video_id)
    REFERENCES public.video_catalog (language, video_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_video_artifacts_meta_gin
  ON public.video_artifacts
  USING GIN (meta);

-- Timestamp triggers
DROP TRIGGER IF EXISTS video_catalog_updated_at ON public.video_catalog;
CREATE TRIGGER video_catalog_updated_at
  BEFORE UPDATE ON public.video_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS video_artifacts_updated_at ON public.video_artifacts;
CREATE TRIGGER video_artifacts_updated_at
  BEFORE UPDATE ON public.video_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Public read access for content library (same behavior as static JSON)
ALTER TABLE public.video_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read video catalog" ON public.video_catalog;
CREATE POLICY "Public read video catalog"
  ON public.video_catalog FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read video artifacts" ON public.video_artifacts;
CREATE POLICY "Public read video artifacts"
  ON public.video_artifacts FOR SELECT
  USING (true);

