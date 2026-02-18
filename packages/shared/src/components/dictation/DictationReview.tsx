import { useState, useMemo } from 'react';
import type { DictationAttempt, Segment } from '../../types';
import type { SegmentStat } from '../../hooks/useDictation';
import { getSegmentText } from '../../lib/languageHelpers';
import DictationResult from './DictationResult';

interface Props {
  segments: Segment[];
  attempts: DictationAttempt[];
  segmentStats: Map<number, SegmentStat>;
  onPracticeSegment: (segmentIndex: number) => void;
}

export default function DictationReview({
  segments,
  attempts,
  segmentStats,
  onPracticeSegment,
}: Props) {
  const [showOnlyWeak, setShowOnlyWeak] = useState(false);

  const sortedSegments = useMemo(() => {
    const practiced = segments.filter((s) => segmentStats.has(s.index));
    const sorted = [...practiced].sort((a, b) => {
      const sa = segmentStats.get(a.index)!;
      const sb = segmentStats.get(b.index)!;
      return sa.bestScore - sb.bestScore;
    });
    if (showOnlyWeak) {
      return sorted.filter((s) => (segmentStats.get(s.index)?.bestScore ?? 100) < 80);
    }
    return sorted;
  }, [segments, segmentStats, showOnlyWeak]);

  if (attempts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm">아직 딕테이션 기록이 없습니다</p>
        <p className="text-xs mt-1">Practice 탭에서 연습을 시작하세요</p>
      </div>
    );
  }

  const totalAttempts = attempts.length;
  const avgBest = segmentStats.size > 0
    ? Math.round(Array.from(segmentStats.values()).reduce((s, v) => s + v.bestScore, 0) / segmentStats.size)
    : 0;
  const weakCount = Array.from(segmentStats.values()).filter(s => s.bestScore < 80).length;

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-indigo-50 rounded-lg p-2">
          <p className="text-lg font-bold text-indigo-700">{segmentStats.size}</p>
          <p className="text-[10px] text-gray-500">연습 세그먼트</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2">
          <p className="text-lg font-bold text-green-700">{avgBest}%</p>
          <p className="text-[10px] text-gray-500">평균 최고점</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2">
          <p className="text-lg font-bold text-red-700">{weakCount}</p>
          <p className="text-[10px] text-gray-500">80% 미만</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyWeak}
            onChange={(e) => setShowOnlyWeak(e.target.checked)}
            className="rounded border-gray-300"
          />
          80% 미만만 보기
        </label>
        <span className="text-xs text-gray-400 ml-auto">총 {totalAttempts}회 시도</span>
      </div>

      {/* Segment list */}
      {sortedSegments.length === 0 ? (
        <p className="text-center text-xs text-gray-400 py-4">
          {showOnlyWeak ? '80% 미만 세그먼트가 없습니다!' : '기록 없음'}
        </p>
      ) : (
        <div className="space-y-2">
          {sortedSegments.map((seg) => {
            const stat = segmentStats.get(seg.index)!;
            const segAttempts = attempts
              .filter((a) => a.segmentIndex === seg.index)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const latest = segAttempts[0];

            return (
              <div key={seg.index} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">#{seg.index + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      stat.bestScore >= 80 ? 'text-green-600' :
                      stat.bestScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      최고 {stat.bestScore}%
                    </span>
                    <span className="text-[10px] text-gray-400">{stat.totalAttempts}회</span>
                  </div>
                </div>
                <p className="text-xs text-gray-700 line-clamp-2">{getSegmentText(seg)}</p>
                {latest && (
                  <DictationResult wordResults={latest.wordResults} score={latest.score} />
                )}
                <button
                  onClick={() => onPracticeSegment(seg.index)}
                  className="w-full py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  다시 연습
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
