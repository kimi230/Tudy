import { useState, useCallback, useEffect, useRef } from 'react';
import type { Segment, DictationWordResult } from '../../types';
import type { SegmentStat } from '../../hooks/useDictation';
import { scoreDictation } from '../../lib/dictationScorer';
import DictationResult from './DictationResult';

interface PlayerControl {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
}

interface Props {
  segments: Segment[];
  currentTime: number;
  player?: PlayerControl | null;
  segmentStats: Map<number, SegmentStat>;
  onAttempt: (params: {
    segmentIndex: number;
    userInput: string;
    correctText: string;
    wordResults: DictationWordResult[];
    score: number;
  }) => void;
}

type Phase = 'ready' | 'listening' | 'typing' | 'scored';

export default function DictationPlayer({
  segments,
  currentTime,
  player,
  segmentStats,
  onAttempt,
}: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const phaseRef = useRef<Phase>('ready');
  const seekTargetRef = useRef<number | null>(null);
  const [userInput, setUserInput] = useState('');
  const [lastResult, setLastResult] = useState<{ wordResults: DictationWordResult[]; score: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const currentSeg = segments[currentIdx];
  const totalDone = Array.from(segmentStats.values()).filter(s => s.totalAttempts > 0).length;
  const avgScore = segmentStats.size > 0
    ? Math.round(Array.from(segmentStats.values()).reduce((sum, s) => sum + s.bestScore, 0) / segmentStats.size)
    : 0;

  // Auto-pause when segment ends
  useEffect(() => {
    if (phaseRef.current !== 'listening' || !currentSeg) return;

    if (seekTargetRef.current !== null) {
      if (Math.abs(currentTime - seekTargetRef.current) < 1) {
        seekTargetRef.current = null;
      }
      return;
    }

    if (currentTime >= currentSeg.end) {
      player?.pause();
      setPhase('typing');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [currentTime, currentSeg, player]);

  const playSegment = useCallback(() => {
    if (!currentSeg || !player) return;
    seekTargetRef.current = currentSeg.start;
    player.seekTo(currentSeg.start);
    player.play();
    setPhase('listening');
  }, [currentSeg, player]);

  const replaySegment = useCallback(() => {
    if (!currentSeg || !player) return;
    seekTargetRef.current = currentSeg.start;
    player.seekTo(currentSeg.start);
    player.play();
    setPhase('listening');
  }, [currentSeg, player]);

  const submitAnswer = useCallback(() => {
    if (!currentSeg) return;
    const result = scoreDictation(currentSeg.textEn, userInput);
    setLastResult(result);
    setPhase('scored');
    onAttempt({
      segmentIndex: currentSeg.index,
      userInput,
      correctText: currentSeg.textEn,
      wordResults: result.wordResults,
      score: result.score,
    });
  }, [currentSeg, userInput, onAttempt]);

  const goNext = useCallback(() => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= segments.length) {
      // all done — stay on scored state
      return;
    }
    setCurrentIdx(nextIdx);
    setUserInput('');
    setLastResult(null);
    setPhase('ready');
  }, [currentIdx, segments.length]);

  const skipSegment = useCallback(() => {
    goNext();
  }, [goNext]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if (isInput) {
        // Inside input field: Enter = submit
        if (e.key === 'Enter' && phaseRef.current === 'typing') {
          e.preventDefault();
          submitAnswer();
        }
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (phaseRef.current === 'ready') playSegment();
        else if (phaseRef.current === 'scored') goNext();
      } else if (e.key === 'r') {
        if (phaseRef.current === 'typing' || phaseRef.current === 'scored') {
          e.preventDefault();
          replaySegment();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        skipSegment();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playSegment, goNext, replaySegment, skipSegment, submitAnswer]);

  const isAllDone = currentIdx >= segments.length - 1 && phase === 'scored';

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{currentIdx + 1} / {segments.length} 세그먼트</span>
        {segmentStats.size > 0 && <span>평균 {avgScore}%</span>}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((currentIdx + (phase === 'scored' ? 1 : 0)) / segments.length) * 100}%` }}
        />
      </div>

      {/* Main interaction card */}
      {currentSeg && (
        <div className={`rounded-lg p-4 transition-colors ${
          phase === 'ready' ? 'bg-indigo-50 border-2 border-dashed border-indigo-300' :
          phase === 'listening' ? 'bg-yellow-50 border-2 border-yellow-300' :
          phase === 'typing' ? 'bg-white border-2 border-indigo-400' :
          'bg-gray-50 border border-gray-200'
        }`}>
          {/* Difficulty badge */}
          {currentSeg.listenDifficulty != null && (
            <div className="mb-2">
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                currentSeg.listenDifficulty <= 2 ? 'bg-green-100 text-green-700' :
                currentSeg.listenDifficulty === 3 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                난이도 {currentSeg.listenDifficulty}
              </span>
            </div>
          )}

          {phase === 'ready' && (
            <div
              className="text-center py-4 cursor-pointer"
              onClick={playSegment}
            >
              <p className="text-sm text-gray-700">터치하여 듣기 시작</p>
              <p className="text-xs text-indigo-500 mt-1 hidden sm:block">
                <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[10px]">Space</kbd>
              </p>
            </div>
          )}

          {phase === 'listening' && (
            <div className="text-center py-4">
              <p className="text-sm text-yellow-700 animate-pulse">듣는 중...</p>
            </div>
          )}

          {phase === 'typing' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">들은 내용을 입력하세요</p>
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="영어로 입력..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={submitAnswer}
                  disabled={!userInput.trim()}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  제출 (Enter)
                </button>
                <button
                  onClick={replaySegment}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 transition-colors"
                  title="다시 듣기 (r)"
                >
                  다시 듣기
                </button>
              </div>
            </div>
          )}

          {phase === 'scored' && lastResult && (
            <div className="space-y-3">
              <DictationResult wordResults={lastResult.wordResults} score={lastResult.score} />
              <p className="text-xs text-gray-500">{currentSeg.textKo}</p>
              <div className="flex items-center gap-2">
                {!isAllDone ? (
                  <button
                    onClick={goNext}
                    className="flex-1 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    다음 (Space)
                  </button>
                ) : (
                  <p className="flex-1 text-center text-sm font-medium text-green-600">
                    모든 세그먼트 완료!
                  </p>
                )}
                <button
                  onClick={replaySegment}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 transition-colors"
                  title="다시 듣기 (r)"
                >
                  다시
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keyboard hints */}
      <div className="text-[10px] text-gray-400 text-center hidden sm:block space-x-2">
        <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Space</kbd> 진행
        <span className="mx-1">/</span>
        <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">r</kbd> 다시 듣기
        <span className="mx-1">/</span>
        <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Esc</kbd> 건너뛰기
      </div>
    </div>
  );
}
