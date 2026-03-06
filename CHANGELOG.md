# Changelog

## 0.0.1 (2026-03-06)

### Features
- **auth**: Firebase Auth 마이그레이션 (Supabase Auth -> Firebase popup Google sign-in)
- **daily**: 딕테이션 후 어휘 퀴즈 추가
- **vocab**: 어휘 페이지에서 단어 연습 퀴즈
- **subscribe**: 학습 가이드 랜딩 페이지 + 이메일 구독
- **instagram**: 릴스 Claude 에이전트 기반 세그먼트 선정
- **pipeline**: 파이프라인 디렉토리 구조 재편 (shared/process/search/pdf/db/instagram)

### Bug Fixes
- **gamification**: XP 지급 원자성 보장 (award_xp_complete 단일 RPC)
- **gamification**: XP 실패 시 토스트 미표시
- **gamification**: 오답노트 XP 파밍 방지 (dedup_key)
- **gamification**: daily_streak XP 자동 지급
- **grammar**: 18개 영상에서 비문법 항목 44개 제거
- **auth**: Tudy 프로필을 공유 auth.users에서 분리

### Chores
- dead code 삭제 (translator.py, analyzer.py, backfill_structure_titleko.py)
- ESLint 설정 통일
