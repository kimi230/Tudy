#!/bin/bash
# Gemini CLI를 사용하여 스크린샷 기반 UI 리뷰 수행
RESIZED="/Users/lindong/stdyEng/screenshots/resized"
OUTPUT="/Users/lindong/stdyEng/screenshots/gemini_feedback.md"

CONTEXT="YouTube 영상 기반 10단계 영어 학습 웹 앱 (React+Tailwind).
학습 단계: 1.처음듣기 2.노트테이킹 3.재듣기+마킹 4.자막비교 5.문장별분석 6.복습듣기 7.오답노트 8.쉐도잉 9.녹음비교 10.요약/토론.
기타: 홈(카테고리별 영상), 라이브러리(검색), 어휘장, 오답노트, URL신청.
Step4 리디자인 기획: 좌측 노트/우측 구조 병렬, 시그널의 [seg N] 클릭→팝업, 트랜스크립트는 하단 접기/펼치기."

echo "# Gemini UI Review - stdyEng" > "$OUTPUT"
echo "Generated: $(date '+%Y-%m-%d %H:%M')" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Batch 1: 정적 페이지
echo "=== Batch 1: Static pages ==="
echo "## 정적 페이지 리뷰" >> "$OUTPUT"
echo "" >> "$OUTPUT"
gemini -p "$CONTEXT

아래 파일들은 정적 페이지 스크린샷입니다. 각 페이지별로 한국어로 리뷰해주세요.
평가 기준: 레이아웃, 사용성, 일관성, 개선 제안.

- $RESIZED/00_home.png (홈 - 카테고리별 영상 목록)
- $RESIZED/01_library.png (라이브러리 - 전체 영상 검색)
- $RESIZED/03_error-notes.png (오답노트)
- $RESIZED/04_request.png (URL 신청)
" >> "$OUTPUT" 2>&1
echo "" >> "$OUTPUT"

# Batch 2: Step 1-4 (듣기+분석 전반)
echo "=== Batch 2: Steps 1-4 ==="
echo "## 학습 워크플로우: Step 1~4" >> "$OUTPUT"
echo "" >> "$OUTPUT"
gemini -p "$CONTEXT

아래 파일들은 학습 워크플로우 Step 1~4 스크린샷입니다. 각 단계별로 한국어로 리뷰해주세요.
특히 Step 4(자막 비교)는 최근 리디자인됨: 좌측 내 노트, 우측 스피치 구조 병렬 배치, 시그널 표현의 [seg N] 클릭 시 팝업, 하단에 접기/펼치기 가능한 트랜스크립트.
기획 의도에 맞는지 집중 평가.

- $RESIZED/step01_Listen.png (Step 1: 처음 듣기)
- $RESIZED/step02_Notes.png (Step 2: 노트테이킹)
- $RESIZED/step03_Mark.png (Step 3: 재듣기+마킹)
- $RESIZED/step04_Compare.png (Step 4: 자막 비교 - 메인 뷰)
- $RESIZED/step04_Compare_popup.png (Step 4: [seg N] 클릭 시 팝업)
- $RESIZED/step04_Compare_transcript.png (Step 4: 트랜스크립트 펼침)
" >> "$OUTPUT" 2>&1
echo "" >> "$OUTPUT"

# Batch 3: Step 5-10 (분석+아웃풋)
echo "=== Batch 3: Steps 5-10 ==="
echo "## 학습 워크플로우: Step 5~10" >> "$OUTPUT"
echo "" >> "$OUTPUT"
gemini -p "$CONTEXT

아래 파일들은 학습 워크플로우 Step 5~10 스크린샷입니다. 각 단계별로 한국어로 리뷰해주세요.
평가 기준: 레이아웃, 사용성, 일관성, 개선 제안.

- $RESIZED/step05_Analyze.png (Step 5: 문장별 분석)
- $RESIZED/step06_Review.png (Step 6: 복습 듣기)
- $RESIZED/step07_ErrorNote.png (Step 7: 오답노트)
- $RESIZED/step08_Shadow.png (Step 8: 쉐도잉)
- $RESIZED/step09_Record.png (Step 9: 녹음 비교)
- $RESIZED/step10_Summary.png (Step 10: 요약/토론)
" >> "$OUTPUT" 2>&1
echo "" >> "$OUTPUT"

# Final: 종합 평가
echo "=== Final: Summary ==="
echo "## 종합 평가" >> "$OUTPUT"
echo "" >> "$OUTPUT"
gemini -p "당신은 UI/UX 전문 리뷰어입니다. 아래는 영어 학습 웹 앱(stdyEng)의 이전 배치 리뷰 결과입니다.

$(cat "$OUTPUT")

위 리뷰를 바탕으로 한국어로 종합 평가를 작성해주세요:
1. 전체적인 디자인 품질 (5점 만점)
2. 가장 잘된 점 3가지
3. 가장 시급한 개선사항 3가지 (우선순위 순)
4. Step4 리디자인 성공도 평가
5. 다음 스프린트에서 해야 할 UI 작업 추천
" >> "$OUTPUT" 2>&1

echo ""
echo "=== All done! ==="
echo "Output: $OUTPUT"
