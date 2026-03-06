# stdyLang

YouTube 영상 기반 다국어 학습 콘텐츠 자동 생성 시스템. (영어/중국어/일본어)

## 프로젝트 구조

```
stdyEng/
├── apps/english, chinese, japanese/   # React 19 + Vite (GitHub Pages)
├── packages/shared/                   # @stdylang/shared (공유 타입/컴포넌트/훅)
├── pipeline/                          # 데이터 파이프라인 (Python)
│   ├── bootstrap.yaml                 # 마스터 워크플로우 정의 ← 여기서 시작
│   ├── shared/                        # 공유 모듈 (utils, downloader, transcriber)
│   ├── process/                       # 영상 처리 (process_video.py)
│   ├── search/                        # 영상 검색 (video_search.py)
│   ├── pdf/                           # PDF 생성 (generate_pdf.py)
│   ├── instagram/                     # Instagram 콘텐츠
│   └── db/                            # DB 동기화 (sync_to_supabase.py)
└── supabase/
```

## 파이프라인

**모든 워크플로우 상세는 `pipeline/bootstrap.yaml` 참조.**

핵심 원칙 3가지:
1. **Claude Code = LLM**. 번역, 분석, 평가는 직접 수행. 외부 LLM API 호출 금지.
2. **도구 = 기계적 작업만**. 다운로드, STT, 인덱스 업데이트, PDF 생성.
3. **직접 파일 I/O**. 분석 결과는 JSON 파일로 직접 작성.

## 데이터 경로

- 학습 데이터: `apps/{language}/public/data/{videoId}/`
- 인덱스: `apps/{language}/public/data/videos.json`
- 임시 파일: `pipeline/.tmp/`
