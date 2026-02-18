-- Add language column to all study-related tables
-- Default 'en' for backward compatibility with existing data

ALTER TABLE public.study_sessions ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
ALTER TABLE public.error_notes ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
ALTER TABLE public.dictation_attempts ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
ALTER TABLE public.recordings ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
ALTER TABLE public.daily_learning_progress ADD COLUMN language TEXT NOT NULL DEFAULT 'en';

-- Update daily_learning_progress unique constraint to include language
ALTER TABLE public.daily_learning_progress DROP CONSTRAINT daily_learning_progress_user_id_video_id_key;
ALTER TABLE public.daily_learning_progress ADD CONSTRAINT daily_learning_progress_user_lang_video_key
  UNIQUE(user_id, video_id, language);

-- Add indexes for language-filtered queries
CREATE INDEX idx_sessions_user_lang ON public.study_sessions (user_id, language);
CREATE INDEX idx_error_notes_user_lang ON public.error_notes (user_id, language);
CREATE INDEX idx_dictation_user_lang ON public.dictation_attempts (user_id, language);
CREATE INDEX idx_daily_progress_user_lang ON public.daily_learning_progress (user_id, language);
