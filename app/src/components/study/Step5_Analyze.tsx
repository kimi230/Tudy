import { useState, useCallback, useEffect } from 'react';
import EtymologyView from '../vocabulary/EtymologyView';
import type { Segment, VocabularyItem, GrammarPattern, ConnectedSpeech } from '../../types';

interface Props {
  currentTime: number;
  segments: Segment[];
  vocabulary: VocabularyItem[];
  grammar: GrammarPattern[];
  connectedSpeech: ConnectedSpeech[];
  reviewNeeded: number[];
  onReviewChange: (indices: number[]) => void;
  onComplete: () => void;
}

export default function Step5_Analyze({
  segments,
  vocabulary,
  grammar,
  connectedSpeech,
  reviewNeeded,
  onReviewChange,
  onComplete,
}: Props) {
  const [currentSegIdx, setCurrentSegIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const currentSeg = segments[currentSegIdx];

  const segVocab = vocabulary.filter((v) => v.segmentIndex === currentSegIdx);
  const segGrammar = grammar.filter((g) => g.segmentIndex === currentSegIdx);
  const segSpeech = connectedSpeech.filter((c) => c.segmentIndex === currentSegIdx);

  // Separate essential vs non-essential vocabulary
  const essentialVocab = segVocab.filter((v) => v.isEssential);
  const otherVocab = segVocab.filter((v) => !v.isEssential);

  const isReviewNeeded = reviewNeeded.includes(currentSegIdx);

  const goToSegment = useCallback((idx: number) => {
    setCurrentSegIdx(idx);
    setRevealed(false);
  }, []);

  const markAndNext = useCallback((understood: boolean) => {
    if (understood) {
      if (isReviewNeeded) onReviewChange(reviewNeeded.filter((i) => i !== currentSegIdx));
    } else {
      if (!isReviewNeeded) onReviewChange([...reviewNeeded, currentSegIdx]);
    }
    goToSegment(Math.min(currentSegIdx + 1, segments.length - 1));
  }, [currentSegIdx, segments.length, isReviewNeeded, reviewNeeded, onReviewChange, goToSegment]);

  // Keyboard shortcuts: Space/Enter = reveal or understood+next, ArrowLeft = 모르겠음+next
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!revealed) {
          setRevealed(true);
        } else {
          markAndNext(true);
        }
      } else if (e.key === 'ArrowLeft' && revealed) {
        e.preventDefault();
        markAndNext(false);
      } else if (e.key === 'ArrowRight' && revealed) {
        e.preventDefault();
        markAndNext(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [revealed, markAndNext]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 5: 직청직해 — 문장별 분석</h3>
        <p className="text-sm text-gray-500">
          한 문장씩 듣고 → "무슨 말이었지?" → 확인 → 원인 분석 (단어/문법/연음)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Segment navigator */}
          <div className="flex items-center gap-3">
            <button
              disabled={currentSegIdx === 0}
              onClick={() => goToSegment(currentSegIdx - 1)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-30"
            >
              ← 이전
            </button>
            <span className="text-sm text-gray-600">
              {currentSegIdx + 1} / {segments.length}
            </span>
            <button
              disabled={currentSegIdx === segments.length - 1}
              onClick={() => goToSegment(currentSegIdx + 1)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-30"
            >
              다음 →
            </button>
          </div>

          {/* 직청직해: tap card to reveal, then mark */}
          {currentSeg && (
            <div
              onClick={() => { if (!revealed) setRevealed(true); }}
              className={`rounded-lg p-4 transition-colors ${
                !revealed
                  ? 'bg-indigo-50 border-2 border-dashed border-indigo-300 cursor-pointer hover:bg-indigo-100'
                  : 'bg-gray-50'
              }`}
            >
              {!revealed ? (
                <div className="text-center py-6">
                  <p className="text-base text-gray-700">이 문장, 무슨 내용이었나요?</p>
                  <p className="text-sm text-indigo-500 mt-2">탭하거나 <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">Space</kbd>를 눌러 확인</p>
                </div>
              ) : (
                <div>
                  <p className="text-base text-gray-900 leading-relaxed">{currentSeg.textEn}</p>
                  <p className="text-sm text-gray-500 mt-2">{currentSeg.textKo}</p>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); markAndNext(true); }}
                      className="flex-1 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 transition-colors"
                    >
                      이해됨 →
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); markAndNext(false); }}
                      className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-colors"
                    >
                      모르겠음 →
                    </button>
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-2">
                    <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Space</kbd> 이해됨
                    <span className="mx-2">·</span>
                    <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">←</kbd> 모르겠음
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Analysis panel — unified view */}
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {/* Vocabulary (etymology + details) */}
          {segVocab.length > 0 && (
            <div className="space-y-3">
              {essentialVocab.length > 0 && (
                <>
                  <p className="text-xs font-medium text-red-600">핵심 단어</p>
                  {essentialVocab.map((v, i) => (
                    <EtymologyView key={`ess-${i}`} item={v} />
                  ))}
                </>
              )}
              {otherVocab.length > 0 && (
                <>
                  <p className="text-xs font-medium text-gray-500">{essentialVocab.length > 0 ? '추가 어휘' : '어휘'}</p>
                  {otherVocab.map((v, i) => (
                    <EtymologyView key={`other-${i}`} item={v} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* Grammar */}
          {segGrammar.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-green-700">문법</p>
              {segGrammar.map((g, i) => (
                <div key={i} className="bg-white border border-green-200 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-gray-900">{g.pattern}</h4>
                  <p className="text-sm text-gray-600 mt-1 italic">"{g.example}"</p>
                  <p className="text-sm text-indigo-600 mt-1">{g.explanationKo}</p>
                </div>
              ))}
            </div>
          )}

          {/* Connected Speech */}
          {segSpeech.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-orange-700">연음</p>
              {segSpeech.map((c, i) => (
                <div key={i} className="bg-white border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">{c.type}</span>
                    <span className="text-sm text-gray-500 line-through">{c.original}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-sm text-gray-900 font-medium">{c.spoken}</span>
                  </div>
                  {c.koreanPhonetic && (
                    <p className="text-xs text-amber-700 mt-1">발음: {c.koreanPhonetic}</p>
                  )}
                  {c.practiceGuide && (
                    <p className="text-xs text-blue-600 mt-1">따라하기: {c.practiceGuide}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {segVocab.length === 0 && segGrammar.length === 0 && segSpeech.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">이 세그먼트에 분석 항목이 없습니다</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">복습필요: {reviewNeeded.length}개</span>
        <button
          onClick={onComplete}
          className="px-5 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          분석 완료 → 다음 단계
        </button>
      </div>
    </div>
  );
}
