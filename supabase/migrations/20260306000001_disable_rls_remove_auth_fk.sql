-- Firebase Auth로 전환: Supabase Auth 의존성 완전 제거

-- 1. 모든 RLS 정책 삭제 (이름 불명확한 것도 포함하여 전부)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 2. RLS 비활성화
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dictation_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_learning_progress DISABLE ROW LEVEL SECURITY;

-- 3. auth.users FK 제거 + UUID → TEXT 변환 (profiles)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE public.profiles ADD PRIMARY KEY (id);

-- 4. auth.users FK 제거 + UUID → TEXT (기타 테이블)
ALTER TABLE public.study_sessions DROP CONSTRAINT IF EXISTS study_sessions_user_id_fkey;
ALTER TABLE public.study_sessions ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.error_notes DROP CONSTRAINT IF EXISTS error_notes_user_id_fkey;
ALTER TABLE public.error_notes ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.dictation_attempts DROP CONSTRAINT IF EXISTS dictation_attempts_user_id_fkey;
ALTER TABLE public.dictation_attempts ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.recordings DROP CONSTRAINT IF EXISTS recordings_user_id_fkey;
ALTER TABLE public.recordings ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.xp_events DROP CONSTRAINT IF EXISTS xp_events_user_id_fkey;
ALTER TABLE public.xp_events ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.user_badges DROP CONSTRAINT IF EXISTS user_badges_user_id_fkey;
ALTER TABLE public.user_badges ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.daily_learning_progress DROP CONSTRAINT IF EXISTS daily_learning_progress_user_id_fkey;
ALTER TABLE public.daily_learning_progress ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 5. auto-profile 트리거 제거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 6. DB 함수 재생성 (UUID → TEXT 파라미터)
DROP FUNCTION IF EXISTS public.increment_xp(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.increment_xp(user_id_input TEXT, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET total_xp = total_xp + amount
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.update_streak(UUID);
CREATE OR REPLACE FUNCTION public.update_streak(user_id_input TEXT)
RETURNS VOID AS $$
DECLARE
  last_date DATE;
  current_streak INTEGER;
  longest INTEGER;
BEGIN
  SELECT last_activity_date, current_streak_days, longest_streak_days
  INTO last_date, current_streak, longest
  FROM public.profiles
  WHERE id = user_id_input;

  IF last_date IS NULL OR last_date < CURRENT_DATE - 1 THEN
    UPDATE public.profiles
    SET current_streak_days = 1,
        last_activity_date = CURRENT_DATE,
        longest_streak_days = GREATEST(longest, 1)
    WHERE id = user_id_input;
  ELSIF last_date = CURRENT_DATE - 1 THEN
    UPDATE public.profiles
    SET current_streak_days = current_streak + 1,
        last_activity_date = CURRENT_DATE,
        longest_streak_days = GREATEST(longest, current_streak + 1)
    WHERE id = user_id_input;
  ELSIF last_date = CURRENT_DATE THEN
    NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.check_and_award_badges(UUID);
CREATE OR REPLACE FUNCTION public.check_and_award_badges(user_id_input TEXT)
RETURNS VOID AS $$
DECLARE
  badge RECORD;
  session_count INTEGER;
  dictation_count INTEGER;
  perfect_count INTEGER;
  resolved_count INTEGER;
  streak INTEGER;
  xp INTEGER;
BEGIN
  SELECT COUNT(*) INTO session_count
  FROM public.study_sessions
  WHERE user_id = user_id_input AND completed_at IS NOT NULL;

  SELECT COUNT(*) INTO dictation_count
  FROM public.dictation_attempts
  WHERE user_id = user_id_input;

  SELECT COUNT(*) INTO perfect_count
  FROM public.dictation_attempts
  WHERE user_id = user_id_input AND score = 100;

  SELECT COUNT(*) INTO resolved_count
  FROM public.error_notes
  WHERE user_id = user_id_input AND is_resolved = TRUE;

  SELECT current_streak_days, total_xp INTO streak, xp
  FROM public.profiles
  WHERE id = user_id_input;

  FOR badge IN SELECT * FROM public.badge_definitions LOOP
    IF EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = user_id_input AND badge_id = badge.id) THEN
      CONTINUE;
    END IF;

    IF (badge.criteria->>'type' = 'session_count' AND session_count >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'streak' AND streak >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'dictation_count' AND dictation_count >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'dictation_perfect' AND perfect_count >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'error_resolved' AND resolved_count >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'xp_milestone' AND xp >= (badge.criteria->>'value')::int) THEN

      INSERT INTO public.user_badges (user_id, badge_id) VALUES (user_id_input, badge.id);

      IF badge.xp_reward > 0 THEN
        UPDATE public.profiles SET total_xp = total_xp + badge.xp_reward WHERE id = user_id_input;
        INSERT INTO public.xp_events (user_id, event_type, xp_amount, metadata)
        VALUES (user_id_input, 'badge_earned', badge.xp_reward, jsonb_build_object('badge_id', badge.id));
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
