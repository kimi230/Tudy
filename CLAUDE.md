# stdyLang

YouTube 영상 기반 다국어 학습 콘텐츠 자동 생성 시스템. (영어/중국어/일본어)

## 프로젝트 구조

```
stdyEng/
├── pnpm-workspace.yaml
├── package.json                     # root: dev:en, dev:zh, dev:ja, build:all
├── packages/
│   └── shared/                      # @stdylang/shared (공유 타입/컴포넌트/훅)
│       ├── package.json
│       └── src/
├── apps/
│   ├── english/                     # @stdylang/english (영어 학습)
│   ├── chinese/                     # @stdylang/chinese (중국어 학습)
│   └── japanese/                    # @stdylang/japanese (일본어 학습)
├── pipeline/                        # 데이터 파이프라인 (Python)
│   ├── process_video.py             # --language en/zh/ja 플래그
│   ├── video_search.py
│   ├── downloader.py
│   ├── transcriber.py
│   ├── bootstrap.yaml
│   ├── workflow.yaml
│   └── search_workflow.yaml
├── supabase/
├── .github/workflows/
│   ├── deploy-english.yml
│   ├── deploy-chinese.yml
│   └── deploy-japanese.yml
└── CLAUDE.md
```

## 워크플로우

에이전틱 워크플로우 정의: `pipeline/bootstrap.yaml`

### 핵심 원칙

- **Claude Code = LLM**. 번역, 분석, 평가는 Claude Code가 직접 수행. 외부 LLM API 호출하지 않음.
- **도구 = 기계적 작업만**. `process_video.py --mechanical-only` (다운로드+STT), `process_video.py --finalize` (인덱스 업데이트).
- **직접 파일 I/O**. 분석 결과는 Claude Code가 JSON 파일로 직접 작성.

### 영상 처리 흐름 (3-Phase)

```
Phase 1 (도구): python3 pipeline/process_video.py --url {url} --category {cat} --language {lang} --mechanical-only
   → _raw_metadata.json, _clean_segments.json 생성

Phase 2 (Claude Code 직접):
   1. _clean_segments.json 읽기
   2. 번역 → segments.json 작성
   3. 난이도 추정
   4. 어휘/문법/발음분석/구조 분석 → 각 JSON 작성
   (언어별로 분석 항목이 다름: EN=연음, ZH=성조, JA=경어)

Phase 3 (도구): python3 pipeline/process_video.py --video-id {id} --finalize --category {cat} --difficulty {diff} --language {lang}
   → meta.json 생성, videos.json 업데이트
```

### 에이전틱 모드에서 사용하지 않는 모듈

- `pipeline/translator.py` — Anthropic API / Ollama 호출. standalone 테스트용.
- `pipeline/analyzer.py` — Ollama 호출. standalone 테스트용.

### 상세 워크플로우 정의

- 영상 처리: `pipeline/workflow.yaml`
- 영상 검색: `pipeline/search_workflow.yaml`

### 데이터 경로

- 영어 데이터: `apps/english/public/data/{videoId}/`
- 중국어 데이터: `apps/chinese/public/data/{videoId}/`
- 일본어 데이터: `apps/japanese/public/data/{videoId}/`
- 인덱스: `apps/{language}/public/data/videos.json`
- 임시 파일: `pipeline/.tmp/`
