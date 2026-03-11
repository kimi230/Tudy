import { useState, useCallback, useEffect, useRef } from 'react';
import VocabDetailView from '../vocabulary/VocabDetailView';
import { getSegmentText, getSegmentReading, getConnectedSpeechLabel } from '../../lib/languageHelpers';
import { getDefaultLanguage } from '../../lib/supabaseSync';
import type { Segment, VocabularyItem, GrammarPattern, ConnectedSpeech } from '../../types';

interface PlayerControl {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
}

interface Props {
  currentTime: number;
  segments: Segment[];
  vocabulary: VocabularyItem[];
  grammar: GrammarPattern[];
  connectedSpeech: ConnectedSpeech[];
  reviewNeeded: number[];
  onReviewChange: (indices: number[]) => void;
  onComplete: () => void;
  player?: PlayerControl | null;
}

type Phase = 'idle' | 'listening' | 'waiting' | 'revealed';

export default function Step5_Analyze({
  currentTime,
  segments,
  vocabulary,
  grammar,
  connectedSpeech,
  reviewNeeded,
  onReviewChange,
  onComplete,
  player,
}: Props) {
  const [currentSegIdx, setCurrentSegIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const seekTargetRef = useRef<number | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const currentSeg = segments[currentSegIdx];

  const segVocab = vocabulary.filter((v) => v.segmentIndex === currentSegIdx);
  const segGrammar = grammar.filter((g) => g.segmentIndex === currentSegIdx);
  const segSpeech = connectedSpeech.filter((c) => c.segmentIndex === currentSegIdx);

  const essentialVocab = segVocab.filter((v) => v.isEssential);
  const otherVocab = segVocab.filter((v) => !v.isEssential);

  const isReviewNeeded = reviewNeeded.includes(currentSegIdx);

  // Auto-pause when current segment ends
  useEffect(() => {
    if (phaseRef.current !== 'listening' || !currentSeg) return;

    // Wait for seekTo to be reflected in currentTime before enabling auto-pause
    if (seekTargetRef.current !== null) {
      if (Math.abs(currentTime - seekTargetRef.current) < 1) {
        seekTargetRef.current = null;
      }
      return;
    }

    if (currentTime >= currentSeg.end) {
      player?.pause();
      setPhase('waiting');
    }
  }, [currentTime, currentSeg, player]);

  const startListening = useCallback(() => {
    if (!currentSeg || !player) return;
    seekTargetRef.current = currentSeg.start;
    player.seekTo(currentSeg.start);
    player.play();
    setPhase('listening');
  }, [currentSeg, player]);

  const reveal = useCallback(() => {
    setPhase('revealed');
  }, []);

  const markAndNext = useCallback((understood: boolean) => {
    if (understood) {
      if (isReviewNeeded) onReviewChange(reviewNeeded.filter((i) => i !== currentSegIdx));
    } else {
      if (!isReviewNeeded) onReviewChange([...reviewNeeded, currentSegIdx]);
    }

    const nextIdx = currentSegIdx + 1;
    if (nextIdx >= segments.length) {
      // All segments done — stay on last, go idle
      setPhase('idle');
      return;
    }

    setCurrentSegIdx(nextIdx);
    const nextSeg = segments[nextIdx];
    if (nextSeg && player) {
      seekTargetRef.current = nextSeg.start;
      player.seekTo(nextSeg.start);
      player.play();
      setPhase('listening');
    }
  }, [currentSegIdx, segments, isReviewNeeded, reviewNeeded, onReviewChange, player]);

  // Manual segment navigation
  const goToSegment = useCallback((idx: number) => {
    setCurrentSegIdx(idx);
    setPhase('idle');
    player?.pause();
  }, [player]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'idle') {
          startListening();
        } else if (phase === 'waiting') {
          reveal();
        } else if (phase === 'revealed') {
          markAndNext(true);
        }
      } else if (e.key === 'ArrowLeft' && phase === 'revealed') {
        e.preventDefault();
        markAndNext(false);
      } else if (e.key === 'ArrowRight' && phase === 'revealed') {
        e.preventDefault();
        markAndNext(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, startListening, reveal, markAndNext]);

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 5: 직청직해</h3>
          <p className="text-xs text-gray-500">복습필요: {reviewNeeded.length}개</p>
        </div>
        <button
          onClick={onComplete}
          className="shrink-0 ml-4 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          다음 →
        </button>
      </div>

      {/* Segment navigator */}
      <div className="flex items-center gap-2">
        <button
          disabled={currentSegIdx === 0}
          onClick={() => goToSegment(currentSegIdx - 1)}
          className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-30"
        >
          ←
        </button>
        <span className="text-xs text-gray-600 flex items-center gap-1.5">
          {currentSegIdx + 1} / {segments.length}
          {currentSeg?.listenDifficulty != null && (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
              currentSeg.listenDifficulty <= 2
                ? 'bg-green-100 text-green-700'
                : currentSeg.listenDifficulty === 3
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                currentSeg.listenDifficulty <= 2
                  ? 'bg-green-400'
                  : currentSeg.listenDifficulty === 3
                  ? 'bg-yellow-400'
                  : 'bg-red-400'
              }`} />
              {currentSeg.listenDifficulty}
            </span>
          )}
        </span>
        <button
          disabled={currentSegIdx === segments.length - 1}
          onClick={() => goToSegment(currentSegIdx + 1)}
          className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-30"
        >
          →
        </button>
      </div>

      {/* 직청직해 card */}
      {currentSeg && (
        <div
          onClick={() => {
            if (phase === 'idle') startListening();
            else if (phase === 'waiting') reveal();
          }}
          className={`rounded-lg p-3 transition-colors ${
            phase === 'idle'
              ? 'bg-indigo-50 border-2 border-dashed border-indigo-300 cursor-pointer hover:bg-indigo-100'
              : phase === 'listening'
              ? 'bg-yellow-50 border-2 border-yellow-300'
              : phase === 'waiting'
              ? 'bg-indigo-50 border-2 border-dashed border-indigo-300 cursor-pointer hover:bg-indigo-100'
              : 'bg-gray-50'
          }`}
        >
          {phase === 'idle' ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-700">터치하여 시작</p>
              <p className="text-xs text-indigo-500 mt-1 hidden sm:block">
                <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[10px]">Space</kbd>
              </p>
            </div>
          ) : phase === 'listening' ? (
            <div className="text-center py-4">
              <p className="text-sm text-yellow-700 animate-pulse">듣는 중...</p>
            </div>
          ) : phase === 'waiting' ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-700">무슨 내용이었나요?</p>
              <p className="text-xs text-indigo-500 mt-1">
                터치하여 확인
                <span className="hidden sm:inline"> / <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[10px]">Space</kbd></span>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-900 leading-relaxed">{getSegmentText(currentSeg)}</p>
              {getSegmentReading(currentSeg) && (
                <p className="text-xs text-gray-400 mt-0.5">{getSegmentReading(currentSeg)}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">{currentSeg.textKo}</p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); markAndNext(true); }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 transition-colors"
                >
                  이해됨 →
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); markAndNext(false); }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-colors"
                >
                  모르겠음 →
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-1.5 hidden sm:block">
                <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Space</kbd> 이해됨
                <span className="mx-1">·</span>
                <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">←</kbd> 모르겠음
              </p>
            </div>
          )}
        </div>
      )}

      {/* Analysis — only visible in revealed phase */}
      {phase === 'revealed' && (
        <>
          {segVocab.length > 0 && (
            <div className="space-y-2">
              {essentialVocab.length > 0 && (
                <>
                  <p className="text-xs font-medium text-red-600">핵심 단어</p>
                  {essentialVocab.map((v, i) => (
                    <VocabDetailView key={`ess-${i}`} item={v} />
                  ))}
                </>
              )}
              {otherVocab.length > 0 && (
                <>
                  <p className="text-xs font-medium text-gray-500">{essentialVocab.length > 0 ? '추가 어휘' : '어휘'}</p>
                  {otherVocab.map((v, i) => (
                    <VocabDetailView key={`other-${i}`} item={v} />
                  ))}
                </>
              )}
            </div>
          )}

          {segGrammar.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-green-700">문법</p>
              {segGrammar.map((g, i) => (
                <div key={i} className="bg-white border border-green-200 rounded-lg p-2">
                  <h4 className="text-xs font-semibold text-gray-900">{g.pattern}</h4>
                  <p className="text-xs text-gray-600 mt-0.5 italic">"{g.example}"</p>
                  <p className="text-xs text-indigo-600 mt-0.5">{g.explanationKo}</p>
                </div>
              ))}
            </div>
          )}

          {segSpeech.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-orange-700">{getConnectedSpeechLabel()}</p>
              {segSpeech.map((c, i) => {
                const lang = getDefaultLanguage();
                if (lang === 'zh') {
                  return (
                    <div key={i} className="bg-white border border-orange-200 rounded-lg p-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-700">{c.type}</span>
                        <span className="text-xs text-gray-900 font-medium">{c.originalText}</span>
                      </div>
                      {c.pinyin && <p className="text-[10px] text-gray-500 mt-0.5">{c.pinyin}</p>}
                      {c.toneChange && <p className="text-[10px] text-amber-700 mt-0.5">변조: {c.toneChange}</p>}
                      {c.explanationKo && <p className="text-[10px] text-gray-600 mt-0.5">{c.explanationKo}</p>}
                      {c.practiceGuide && <p className="text-[10px] text-blue-600 mt-0.5">따라하기: {c.practiceGuide}</p>}
                    </div>
                  );
                }
                if (lang === 'ja') {
                  return (
                    <div key={i} className="bg-white border border-orange-200 rounded-lg p-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-700">{c.type}</span>
                        <span className="text-xs text-gray-900 font-medium">{c.originalText}</span>
                        {c.baseForm && (
                          <>
                            <span className="text-gray-400 text-xs">←</span>
                            <span className="text-xs text-gray-500">{c.baseForm}</span>
                          </>
                        )}
                      </div>
                      {c.reading && <p className="text-[10px] text-gray-500 mt-0.5">{c.reading}</p>}
                      {c.politeLevel && <p className="text-[10px] text-amber-700 mt-0.5">경어 수준: {c.politeLevel}</p>}
                      {c.explanationKo && <p className="text-[10px] text-gray-600 mt-0.5">{c.explanationKo}</p>}
                      {c.usageContext && <p className="text-[10px] text-blue-600 mt-0.5">사용 상황: {c.usageContext}</p>}
                    </div>
                  );
                }
                // English (default)
                return (
                  <div key={i} className="bg-white border border-orange-200 rounded-lg p-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-700">{c.type}</span>
                      <span className="text-xs text-gray-900 font-medium">{c.originalText}</span>
                      {c.phonetic && (
                        <span className="text-xs text-gray-400">{c.phonetic}</span>
                      )}
                    </div>
                    {c.koreanPhonetic && (
                      <p className="text-[10px] text-amber-700 mt-0.5">발음: {c.koreanPhonetic}</p>
                    )}
                    {c.explanationKo && (
                      <p className="text-[10px] text-gray-600 mt-0.5">{c.explanationKo}</p>
                    )}
                    {c.practiceGuide && (
                      <p className="text-[10px] text-blue-600 mt-0.5">따라하기: {c.practiceGuide}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {segVocab.length === 0 && segGrammar.length === 0 && segSpeech.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">이 세그먼트에 분석 항목이 없습니다</p>
          )}
        </>
      )}
    </div>
  );
}
