import { useEffect, useRef, useCallback, useContext, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadSegments, loadVideoMeta } from '../../lib/dataLoader';
import { useDictation } from '../../hooks/useDictation';
import { useAuth } from '../../hooks/useAuth';
import { XP_RULES, calcDailySessionXP } from '../../hooks/useRewards';
import { awardXP } from '../../lib/xpService';
import { XPToastContext } from '../../contexts/XPToastContext';
import type { Segment, VideoMeta } from '../../types';
import type { DailyLearningProgress } from '../../lib/dailyLearningSync';
import YouTubePlayer from '../common/YouTubePlayer';
import type { YouTubePlayerHandle } from '../common/YouTubePlayer';
import DifficultyBadge from '../common/DifficultyBadge';
import DictationPlayer from '../dictation/DictationPlayer';

const BATCH_SIZE = 10;

interface Props {
  progress: DailyLearningProgress;
  onComplete: (nextSegmentIndex: number, totalSegments: number) => Promise<void>;
  onChangeVideo: () => void;
}

export default function DailyWorkflow({ progress, onComplete, onChangeVideo }: Props) {
  const navigate = useNavigate();
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [allSegments, setAllSegments] = useState<Segment[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const { loading: dictLoading, addAttempt, segmentStats } = useDictation(progress.videoId);
  const auth = useAuth();
  const xpToast = useContext(XPToastContext);
  const userIdRef = useRef(auth.user?.id);
  userIdRef.current = auth.user?.id;

  // Load segments and meta
  useEffect(() => {
    Promise.all([
      loadSegments(progress.videoId).then((d) => d.segments),
      loadVideoMeta(progress.videoId),
    ])
      .then(([segs, m]) => {
        setAllSegments(segs);
        setMeta(m);
      })
      .finally(() => setDataLoading(false));
  }, [progress.videoId]);

  // Slice segments for this session (full batch)
  const sessionSegments = useMemo(() => {
    const start = progress.nextSegmentIndex;
    return allSegments.slice(start, start + BATCH_SIZE);
  }, [allSegments, progress.nextSegmentIndex]);

  // Track how many segments in this session have been attempted
  const sessionAttemptedCount = useMemo(() => {
    let count = 0;
    for (const seg of sessionSegments) {
      if (segmentStats.has(seg.index)) count++;
    }
    return count;
  }, [sessionSegments, segmentStats]);

  // Compute initial index for DictationPlayer (skip already attempted segments)
  // Only set after data is loaded; ref ensures it's calculated once
  const initialIndexRef = useRef<number | null>(null);
  if (initialIndexRef.current === null && !dictLoading) {
    let idx = 0;
    for (const seg of sessionSegments) {
      if (segmentStats.has(seg.index)) idx++;
      else break;
    }
    initialIndexRef.current = idx;
  }

  // Calculate session average score
  const sessionAvgScore = useMemo(() => {
    const scores: number[] = [];
    for (const seg of sessionSegments) {
      const stat = segmentStats.get(seg.index);
      if (stat) scores.push(stat.bestScore);
    }
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, [sessionSegments, segmentStats]);

  // Check if all segments in this session are done
  const allSessionDone = sessionAttemptedCount >= sessionSegments.length && sessionSegments.length > 0;

  // Handle session completion
  const handleSessionComplete = useCallback(async () => {
    const uid = userIdRef.current;
    const totalSegs = allSegments.length;
    const nextIdx = Math.min(progress.nextSegmentIndex + sessionSegments.length, totalSegs);

    // Calculate score-based XP
    const xp = calcDailySessionXP(sessionAvgScore);

    // Award daily session complete XP
    if (uid) {
      try {
        await awardXP(uid, 'daily_session_complete', xp, {
          videoId: progress.videoId, segmentsCompleted: sessionSegments.length, avgScore: sessionAvgScore,
        });
        xpToast?.showXPToast(xp, `오늘의 학습 완료 (${sessionAvgScore}%)`);
        auth.refreshProfile();
      } catch { /* offline */ }
    }

    await onComplete(nextIdx, totalSegs);
    navigate('/');
  }, [allSegments.length, progress.nextSegmentIndex, progress.videoId, sessionSegments.length, sessionAvgScore, onComplete, xpToast, auth, navigate]);

  if (dataLoading || dictLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!meta || sessionSegments.length === 0) {
    // Video already completed or no segments
    return (
      <div className="text-center py-20 space-y-4">
        <div className="text-4xl">🎉</div>
        <p className="text-lg font-semibold text-gray-900">이 영상의 모든 문장을 완료했습니다!</p>
        <button
          onClick={onChangeVideo}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          다른 영상 선택하기
        </button>
      </div>
    );
  }

  const totalSegs = allSegments.length;
  const overallProgress = progress.nextSegmentIndex + sessionAttemptedCount;
  const overallPct = totalSegs > 0 ? Math.round((overallProgress / totalSegs) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/daily" className="text-sm text-indigo-600 hover:underline">
            ← 오늘의 학습
          </Link>
          <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
            {sessionAttemptedCount}/{sessionSegments.length} 문장
          </span>
          <span className="text-xs text-gray-400">
            영상 진행률 {overallPct}% ({overallProgress}/{totalSegs})
          </span>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mt-1">{meta.title}</h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm text-gray-400">{meta.channel}</span>
          <DifficultyBadge difficulty={meta.difficulty} />
        </div>
      </div>

      {/* Main layout */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-4 lg:space-y-0">
        <YouTubePlayer
          ref={playerRef}
          youtubeId={meta.youtubeId}
          onTimeUpdate={setCurrentTime}
          className="lg:col-span-2"
        />
        <div>
          {allSessionDone ? (
            <div className="space-y-4 text-center py-8">
              <p className="text-lg font-semibold text-green-600">
                {sessionSegments.length}문장 모두 완료!
              </p>
              <button
                onClick={handleSessionComplete}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                학습 완료하기
              </button>
            </div>
          ) : (
            <DictationPlayer
              segments={sessionSegments}
              currentTime={currentTime}
              player={playerRef.current}
              segmentStats={segmentStats}
              onAttempt={addAttempt}
              initialIndex={initialIndexRef.current ?? 0}
              hideProgress
            />
          )}
        </div>
      </div>
    </div>
  );
}
