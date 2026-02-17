import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadSegments } from '../../lib/dataLoader';
import { useDictation } from '../../hooks/useDictation';
import type { Segment, VideoMeta } from '../../types';
import YouTubePlayer from '../common/YouTubePlayer';
import type { YouTubePlayerHandle } from '../common/YouTubePlayer';
import DifficultyBadge from '../common/DifficultyBadge';
import DifficultySelector, { type DifficultyFilter } from './DifficultySelector';
import DictationPlayer from './DictationPlayer';
import DictationReview from './DictationReview';

type Mode = 'setup' | 'practice' | 'review';

interface Props {
  videoId: string;
  meta: VideoMeta;
}

export default function DictationWorkflow({ videoId, meta }: Props) {
  const [allSegments, setAllSegments] = useState<Segment[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('setup');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const { attempts, loading: dictLoading, addAttempt, segmentStats } = useDictation(videoId);

  useEffect(() => {
    loadSegments(videoId)
      .then((d) => setAllSegments(d.segments))
      .finally(() => setDataLoading(false));
  }, [videoId]);

  const filteredSegments = useMemo(() => {
    if (!difficultyFilter || difficultyFilter === 'all') return allSegments;
    return allSegments.filter((s) => {
      if (s.listenDifficulty == null) return false;
      if (difficultyFilter === 'easy') return s.listenDifficulty <= 2;
      if (difficultyFilter === 'medium') return s.listenDifficulty === 3;
      if (difficultyFilter === 'hard') return s.listenDifficulty >= 4;
      return true;
    });
  }, [allSegments, difficultyFilter]);

  const handleDifficultySelect = useCallback((filter: DifficultyFilter) => {
    setDifficultyFilter(filter);
    setMode('practice');
  }, []);

  const handlePracticeSegment = useCallback((_segmentIndex: number) => {
    setMode('practice');
  }, []);

  if (dataLoading || dictLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Link to={`/category/${meta.categoryId}`} className="text-sm text-indigo-600 hover:underline">
            ← 목록으로
          </Link>
          <Link
            to={`/study/${videoId}`}
            className="text-sm px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200 transition-colors font-medium"
          >
            10단계 학습
          </Link>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mt-1">{meta.title}</h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm text-gray-400">{meta.channel}</span>
          <DifficultyBadge difficulty={meta.difficulty} />
          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">딕테이션</span>
        </div>
      </div>

      {/* Mode tabs */}
      {mode !== 'setup' && (
        <div className="flex gap-1 border-b border-gray-200">
          {(['practice', 'review'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mode === m
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'practice' ? 'Practice' : 'Review'}
            </button>
          ))}
          <button
            onClick={() => { setMode('setup'); setDifficultyFilter(null); }}
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-600 ml-auto"
          >
            난이도 변경
          </button>
        </div>
      )}

      {/* Content */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-4 lg:space-y-0">
        <YouTubePlayer
          ref={playerRef}
          youtubeId={meta.youtubeId}
          onTimeUpdate={setCurrentTime}
          className="lg:col-span-2"
        />
        <div>
          {mode === 'setup' ? (
            <DifficultySelector segments={allSegments} onSelect={handleDifficultySelect} />
          ) : mode === 'practice' ? (
            <DictationPlayer
              segments={filteredSegments}
              currentTime={currentTime}
              player={playerRef.current}
              segmentStats={segmentStats}
              onAttempt={addAttempt}
            />
          ) : (
            <DictationReview
              segments={allSegments}
              attempts={attempts}
              segmentStats={segmentStats}
              onPracticeSegment={handlePracticeSegment}
            />
          )}
        </div>
      </div>
    </div>
  );
}
