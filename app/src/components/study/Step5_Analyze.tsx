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

type AnalysisView = 'dictation' | 'vocab' | 'grammar' | 'speech';

export default function Step5_Analyze({
  segments,
  vocabulary,
  grammar,
  connectedSpeech,
  reviewNeeded,
  onReviewChange,
  onComplete,
}: Props) {
  const [activeView, setActiveView] = useState<AnalysisView>('dictation');
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

        {/* Analysis panel */}
        <div>
          <div className="flex border-b border-gray-200 mb-4">
            {([
              { id: 'dictation' as AnalysisView, label: '어원' },
              { id: 'vocab' as AnalysisView, label: `어휘 (${segVocab.length})` },
              { id: 'grammar' as AnalysisView, label: `문법 (${segGrammar.length})` },
              { id: 'speech' as AnalysisView, label: `연음 (${segSpeech.length})` },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeView === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {/* Etymology view (default) */}
            {activeView === 'dictation' && (
              <>
                {essentialVocab.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-red-600">핵심 단어 (중심 파악에 필수)</p>
                    {essentialVocab.map((v, i) => (
                      <EtymologyView key={i} item={v} />
                    ))}
                  </div>
                )}
                {otherVocab.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <p className="text-xs font-medium text-gray-500">추가 어휘</p>
                    {otherVocab.map((v, i) => (
                      <EtymologyView key={i} item={v} />
                    ))}
                  </div>
                )}
                {segVocab.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">이 세그먼트에 어휘 항목이 없습니다</p>
                )}
              </>
            )}

            {/* Vocabulary list */}
            {activeView === 'vocab' && (
              <>
                {segVocab.map((v, i) => (
                  <div
                    key={i}
                    className={`bg-white border rounded-lg p-4 ${
                      v.isEssential ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {v.word}
                        {v.isEssential && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                            핵심
                          </span>
                        )}
                      </h4>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {v.partOfSpeech}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">{v.phonetic}</p>
                    <p className="text-sm text-gray-700 mb-2">{v.definition}</p>
                    <p className="text-sm text-indigo-600 font-medium">{v.koreanMeaning}</p>
                    {v.rootBreakdown && v.rootBreakdown.root && (
                      <div className="mt-2 flex items-center gap-1 flex-wrap text-xs">
                        {v.rootBreakdown.prefix && (
                          <>
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{v.rootBreakdown.prefix}</span>
                            <span className="text-gray-300">+</span>
                          </>
                        )}
                        <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-medium">{v.rootBreakdown.root}</span>
                        {v.rootBreakdown.suffix && (
                          <>
                            <span className="text-gray-300">+</span>
                            <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{v.rootBreakdown.suffix}</span>
                          </>
                        )}
                      </div>
                    )}
                    {v.relatedWords && v.relatedWords.length > 0 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {v.relatedWords.map((rw, j) => (
                          <span key={j} className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                            {rw}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2 italic">"{v.contextSentence}"</p>
                  </div>
                ))}
                {segVocab.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">이 세그먼트에 해당 항목이 없습니다</p>
                )}
              </>
            )}

            {/* Grammar */}
            {activeView === 'grammar' && segGrammar.map((g, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900">{g.pattern}</h4>
                <p className="text-sm text-gray-600 mt-1 italic">"{g.example}"</p>
                <p className="text-sm text-indigo-600 mt-2">{g.explanationKo}</p>
              </div>
            ))}

            {/* Connected Speech */}
            {activeView === 'speech' && segSpeech.map((c, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">{c.type}</span>
                </div>
                <p className="text-sm">
                  <span className="text-gray-500 line-through">{c.original}</span>
                  <span className="mx-2">→</span>
                  <span className="text-gray-900 font-medium">{c.spoken}</span>
                </p>
                {c.koreanPhonetic && (
                  <p className="text-sm text-amber-700 mt-1">발음: {c.koreanPhonetic}</p>
                )}
                {c.practiceGuide && (
                  <div className="mt-2 bg-blue-50 rounded px-3 py-2">
                    <p className="text-sm text-blue-700">
                      직접 따라 말해보세요: {c.practiceGuide}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {((activeView === 'grammar' && segGrammar.length === 0) ||
              (activeView === 'speech' && segSpeech.length === 0)) && (
              <p className="text-sm text-gray-400 text-center py-8">이 세그먼트에 해당 항목이 없습니다</p>
            )}
          </div>
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
