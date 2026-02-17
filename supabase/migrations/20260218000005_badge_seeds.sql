-- 배지 시드 데이터
INSERT INTO public.badge_definitions (id, name_ko, description_ko, icon, xp_reward, criteria) VALUES
  ('first_session', '첫 걸음', '첫 학습 세션을 완료했습니다', '🎯', 50, '{"type": "session_count", "value": 1}'),
  ('steady_learner', '꾸준한 학습자', '5회 학습 세션을 완료했습니다', '📚', 100, '{"type": "session_count", "value": 5}'),
  ('streak_3', '3일 연속', '3일 연속으로 학습했습니다', '🔥', 30, '{"type": "streak", "value": 3}'),
  ('streak_7', '7일 연속', '7일 연속으로 학습했습니다', '💪', 70, '{"type": "streak", "value": 7}'),
  ('streak_30', '30일 연속', '30일 연속으로 학습했습니다', '🏆', 300, '{"type": "streak", "value": 30}'),
  ('first_dictation', '첫 딕테이션', '첫 딕테이션을 시도했습니다', '✍️', 20, '{"type": "dictation_count", "value": 1}'),
  ('dictation_perfect', '완벽한 귀', '딕테이션에서 만점을 받았습니다', '👂', 50, '{"type": "dictation_perfect", "value": 1}'),
  ('dictation_100', '딕테이션 마스터', '100회 딕테이션을 완료했습니다', '🎧', 200, '{"type": "dictation_count", "value": 100}'),
  ('error_hunter', '오답 사냥꾼', '오답노트 10개를 해결했습니다', '🔍', 100, '{"type": "error_resolved", "value": 10}'),
  ('xp_1000', 'XP 마일스톤', '1000 XP를 달성했습니다', '⭐', 0, '{"type": "xp_milestone", "value": 1000}');
