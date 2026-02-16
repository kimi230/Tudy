# stdyEng

YouTube 영상 기반 영어 학습 콘텐츠 자동 생성 시스템.

## 워크플로우

에이전틱 워크플로우 정의: `scripts/bootstrap.yaml`

### 핵심 원칙

- **Claude Code = LLM**. 번역, 분석, 평가는 Claude Code가 직접 수행. 외부 LLM API 호출하지 않음.
- **도구 = 기계적 작업만**. `process_video.py --mechanical-only` (다운로드+STT), `process_video.py --finalize` (인덱스 업데이트).
- **직접 파일 I/O**. 분석 결과는 Claude Code가 JSON 파일로 직접 작성.

### 영상 처리 흐름 (3-Phase)

```
Phase 1 (도구): python3 scripts/process_video.py --url {url} --category {cat} --mechanical-only
   → _raw_metadata.json, _clean_segments.json 생성

Phase 2 (Claude Code 직접):
   1. _clean_segments.json 읽기
   2. 번역 → segments.json 작성
   3. 난이도 추정
   4. 어휘/문법/연음/구조 분석 → 각 JSON 작성

Phase 3 (도구): python3 scripts/process_video.py --video-id {id} --finalize --category {cat} --difficulty {diff}
   → meta.json 생성, videos.json 업데이트
```

### 에이전틱 모드에서 사용하지 않는 모듈

- `translator.py` — Anthropic API / Ollama 호출. standalone 테스트용.
- `analyzer.py` — Ollama 호출. standalone 테스트용.
- `batch_process.sh` — 레거시. 사용하지 않음.

### 상세 워크플로우 정의

- 영상 처리: `scripts/workflow.yaml`
- 영상 검색: `scripts/search_workflow.yaml`

### 데이터 경로

- 학습 데이터: `frontend/public/data/{videoId}/`
- 인덱스: `frontend/public/data/videos.json`
- 임시 파일: `scripts/.tmp/`
