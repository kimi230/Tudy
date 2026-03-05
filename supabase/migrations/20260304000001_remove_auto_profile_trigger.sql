-- 트리거 제거: auth.users 가입 시 자동 프로필 생성 중단
-- 이유: 사주팔자/fit/kps 등 다른 프로젝트 유저까지 profiles에 생성되는 문제
-- 대안: Tudy 앱에서 로그인 시 직접 upsert

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Tudy 앱에서 프로필을 직접 생성할 수 있도록 INSERT 정책 추가
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
