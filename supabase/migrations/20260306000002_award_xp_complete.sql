-- award_xp_complete: 단일 RPC로 XP 지급 전체 플로우를 원자적으로 수행
-- dedup_key로 중복 방지 (오답노트 파밍 등)

-- 1. xp_events에 dedup_key 컬럼 추가
ALTER TABLE public.xp_events ADD COLUMN IF NOT EXISTS dedup_key TEXT;

-- 부분 유니크 인덱스: (user_id, dedup_key) where dedup_key is not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_events_dedup
  ON public.xp_events (user_id, dedup_key)
  WHERE dedup_key IS NOT NULL;

-- 2. award_xp_complete 통합 함수
CREATE OR REPLACE FUNCTION public.award_xp_complete(
  user_id_input TEXT,
  event_type_input TEXT,
  xp_amount_input INTEGER,
  metadata_input JSONB DEFAULT NULL,
  dedup_key_input TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  last_date DATE;
  current_streak INTEGER;
  longest INTEGER;
  new_streak INTEGER;
  new_total_xp INTEGER;
  streak_increased BOOLEAN := FALSE;
  badges_earned TEXT[] := '{}';
  badge RECORD;
  session_count INTEGER;
  dictation_count INTEGER;
  perfect_count INTEGER;
  resolved_count INTEGER;
  xp_val INTEGER;
BEGIN
  -- Dedup check
  IF dedup_key_input IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.xp_events
      WHERE user_id = user_id_input AND dedup_key = dedup_key_input
    ) THEN
      RETURN jsonb_build_object('success', false, 'reason', 'duplicate');
    END IF;
  END IF;

  -- 1. Insert XP event
  INSERT INTO public.xp_events (user_id, event_type, xp_amount, metadata, dedup_key)
  VALUES (user_id_input, event_type_input, xp_amount_input, metadata_input, dedup_key_input);

  -- 2. Increment XP
  UPDATE public.profiles
  SET total_xp = total_xp + xp_amount_input
  WHERE id = user_id_input;

  -- 3. Update streak
  SELECT last_activity_date, current_streak_days, longest_streak_days
  INTO last_date, current_streak, longest
  FROM public.profiles
  WHERE id = user_id_input;

  IF last_date IS NULL OR last_date < CURRENT_DATE - 1 THEN
    new_streak := 1;
    streak_increased := TRUE;
    UPDATE public.profiles
    SET current_streak_days = 1,
        last_activity_date = CURRENT_DATE,
        longest_streak_days = GREATEST(longest, 1)
    WHERE id = user_id_input;
  ELSIF last_date = CURRENT_DATE - 1 THEN
    new_streak := current_streak + 1;
    streak_increased := TRUE;
    UPDATE public.profiles
    SET current_streak_days = new_streak,
        last_activity_date = CURRENT_DATE,
        longest_streak_days = GREATEST(longest, new_streak)
    WHERE id = user_id_input;
  ELSIF last_date = CURRENT_DATE THEN
    new_streak := current_streak;
    -- Same day, no streak change
  END IF;

  -- 4. Award daily_streak XP if streak increased
  IF streak_increased THEN
    INSERT INTO public.xp_events (user_id, event_type, xp_amount, metadata, dedup_key)
    VALUES (
      user_id_input,
      'daily_streak',
      10,
      jsonb_build_object('streak_days', new_streak),
      'daily_streak_' || CURRENT_DATE::TEXT
    )
    ON CONFLICT (user_id, dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;

    -- Only add XP if the streak event was actually inserted
    IF FOUND THEN
      UPDATE public.profiles
      SET total_xp = total_xp + 10
      WHERE id = user_id_input;
    END IF;
  END IF;

  -- 5. Check and award badges
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

  SELECT current_streak_days, total_xp INTO new_streak, xp_val
  FROM public.profiles
  WHERE id = user_id_input;

  FOR badge IN SELECT * FROM public.badge_definitions LOOP
    IF EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = user_id_input AND badge_id = badge.id) THEN
      CONTINUE;
    END IF;

    IF (badge.criteria->>'type' = 'session_count' AND session_count >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'streak' AND new_streak >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'dictation_count' AND dictation_count >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'dictation_perfect' AND perfect_count >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'error_resolved' AND resolved_count >= (badge.criteria->>'value')::int) OR
       (badge.criteria->>'type' = 'xp_milestone' AND xp_val >= (badge.criteria->>'value')::int) THEN

      INSERT INTO public.user_badges (user_id, badge_id) VALUES (user_id_input, badge.id);
      badges_earned := array_append(badges_earned, badge.id);

      IF badge.xp_reward > 0 THEN
        UPDATE public.profiles SET total_xp = total_xp + badge.xp_reward WHERE id = user_id_input;
        INSERT INTO public.xp_events (user_id, event_type, xp_amount, metadata)
        VALUES (user_id_input, 'badge_earned', badge.xp_reward, jsonb_build_object('badge_id', badge.id));
      END IF;
    END IF;
  END LOOP;

  -- Get final total_xp
  SELECT total_xp INTO new_total_xp
  FROM public.profiles
  WHERE id = user_id_input;

  RETURN jsonb_build_object(
    'success', true,
    'total_xp', new_total_xp,
    'badges_earned', to_jsonb(badges_earned)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
