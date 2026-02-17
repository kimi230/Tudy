-- XP 이벤트 로그 (append-only)
CREATE TABLE public.xp_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_xp_user ON public.xp_events (user_id, created_at DESC);

-- 배지 정의 (seed data)
CREATE TABLE public.badge_definitions (
  id TEXT PRIMARY KEY,
  name_ko TEXT NOT NULL,
  description_ko TEXT NOT NULL,
  icon TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  criteria JSONB NOT NULL
);

-- 사용자 획득 배지
CREATE TABLE public.user_badges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badge_definitions(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- RLS
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_xp" ON public.xp_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_xp" ON public.xp_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "read_badges" ON public.badge_definitions
  FOR SELECT USING (true);
CREATE POLICY "own_badges" ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "earn_badges" ON public.user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- DB 함수: XP 증가
CREATE OR REPLACE FUNCTION public.increment_xp(user_id_input UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET total_xp = total_xp + amount
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DB 함수: 스트릭 업데이트
CREATE OR REPLACE FUNCTION public.update_streak(user_id_input UUID)
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
    -- Streak broken or first activity
    UPDATE public.profiles
    SET current_streak_days = 1,
        last_activity_date = CURRENT_DATE,
        longest_streak_days = GREATEST(longest, 1)
    WHERE id = user_id_input;
  ELSIF last_date = CURRENT_DATE - 1 THEN
    -- Consecutive day
    UPDATE public.profiles
    SET current_streak_days = current_streak + 1,
        last_activity_date = CURRENT_DATE,
        longest_streak_days = GREATEST(longest, current_streak + 1)
    WHERE id = user_id_input;
  ELSIF last_date = CURRENT_DATE THEN
    -- Same day, no change
    NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DB 함수: 배지 체크 및 부여
CREATE OR REPLACE FUNCTION public.check_and_award_badges(user_id_input UUID)
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
  -- Gather stats
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

  -- Check each badge definition
  FOR badge IN SELECT * FROM public.badge_definitions LOOP
    -- Skip if already earned
    IF EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = user_id_input AND badge_id = badge.id) THEN
      CONTINUE;
    END IF;

    -- Check criteria
    IF (badge.criteria->>'type' = 'session_count' AND session_count >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'streak' AND streak >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'dictation_count' AND dictation_count >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'dictation_perfect' AND perfect_count >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'error_resolved' AND resolved_count >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'xp_milestone' AND xp >= (badge.criteria->>'value')::int) THEN

      INSERT INTO public.user_badges (user_id, badge_id) VALUES (user_id_input, badge.id);

      -- Award badge XP reward
      IF badge.xp_reward > 0 THEN
        UPDATE public.profiles SET total_xp = total_xp + badge.xp_reward WHERE id = user_id_input;
        INSERT INTO public.xp_events (user_id, event_type, xp_amount, metadata)
        VALUES (user_id_input, 'badge_earned', badge.xp_reward, jsonb_build_object('badge_id', badge.id));
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
