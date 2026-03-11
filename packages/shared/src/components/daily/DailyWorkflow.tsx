import { useEffect, useRef, useCallback, useContext, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadSegments, loadVideoMeta, loadVocabulary } from '../../lib/dataLoader';
import { useDictation } from '../../hooks/useDictation';
import { useUserIdRef } from '../../hooks/useUserIdRef';
import { calcDailySessionXP, calcVocabQuizXP } from '../../hooks/useRewards';
import { awardXP } from '../../lib/xpService';
import { XPToastContext } from '../../contexts/XPToastContext';
import YouTubePlayer from '../common/YouTubePlayer';
import DifficultyBadge from '../common/DifficultyBadge';
import VocabQuiz from './VocabQuiz';
import type { QuizResult } from '../../lib/vocabQuizEngine';
import type { Segment, VideoMeta, VocabularyItem } from '../../types';
import type { DailyLearningProgress } from '../../lib/dailyLearningSync';
import type { YouTubePlayerHandle } from '../common/YouTubePlayer';
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
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [phase, setPhase] = useState<'dictation' | 'vocab_quiz' | 'completed'>('dictation');
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const { loading: dictLoading, addAttempt, segmentStats } = useDictation(progress.videoId);
  const { auth, userIdRef } = useUserIdRef();
  const xpToast = useContext(XPToastContext);

  // Load segments, meta, and vocabulary
  useEffect(() => {
    Promise.all([
      loadSegments(progress.videoId).then((d) => d.segments),
      loadVideoMeta(progress.videoId),
      loadVocabulary(progress.videoId).catch(() => [] as VocabularyItem[]),
    ])
      .then(([segs, m, vocab]) => {
        setAllSegments(segs);
        setMeta(m);
        setVocabulary(Array.isArray(vocab) ? vocab : []);
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
  const initialIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (initialIndexRef.current === null && !dictLoading && sessionSegments.length > 0) {
      let idx = 0;
      for (const seg of sessionSegments) {
        if (segmentStats.has(seg.index)) idx++;
        else break;
      }
      initialIndexRef.current = idx;
    }
  }, [dictLoading, sessionSegments, segmentStats]);

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

  // Segment range for this session (used by vocab quiz)
  const sessionSegmentRange = useMemo<[number, number]>(() => {
    if (sessionSegments.length === 0) return [0, 0];
    return [sessionSegments[0].index, sessionSegments[sessionSegments.length - 1].index + 1];
  }, [sessionSegments]);

  // When dictation is done, transition to vocab quiz (or skip if < 4 vocab items)
  const handleDictationDone = useCallback(() => {
    if (vocabulary.length >= 4) {
      setPhase('vocab_quiz');
    } else {
      setPhase('completed');
    }
  }, [vocabulary.length]);

  // Handle vocab quiz completion
  const handleQuizComplete = useCallback((result: QuizResult) => {
    setQuizResult(result);
    setPhase('completed');

    // Award quiz XP
    const uid = userIdRef.current;
    if (uid && result.totalQuestions > 0) {
      const quizXP = calcVocabQuizXP(result.score);
      awardXP(uid, 'vocab_quiz_complete', quizXP, {
        videoId: progress.videoId, score: result.score, correct: result.correctCount, total: result.totalQuestions,
      }).then((awarded) => {
        if (awarded) xpToast?.showXPToast(awarded, `어휘 퀴즈 (${result.score}%)`);
        auth.refreshProfile();
      }).catch(() => { /* offline */ });
    }
  }, [progress.videoId, xpToast, auth]);

  // Handle final session completion
  const handleSessionComplete = useCallback(async () => {
    const uid = userIdRef.current;
    const totalSegs = allSegments.length;
    const nextIdx = Math.min(progress.nextSegmentIndex + sessionSegments.length, totalSegs);

    // Calculate score-based XP for dictation
    const xp = calcDailySessionXP(sessionAvgScore);

    // Award daily session complete XP
    if (uid) {
      try {
        const awarded = await awardXP(uid, 'daily_session_complete', xp, {
          videoId: progress.videoId, segmentsCompleted: sessionSegments.length, avgScore: sessionAvgScore,
        });
        if (awarded) xpToast?.showXPToast(awarded, `오늘의 학습 완료 (${sessionAvgScore}%)`);
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
      {phase === 'dictation' && (
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-4 lg:space-y-0">
          <YouTubePlayer
            ref={playerRef}
            youtubeId={meta.youtubeId}
            onTimeUpdate={setCurrentTime}
            onReady={() => setPlayerReady(true)}
            className="lg:col-span-2"
          />
          <div>
            {allSessionDone ? (
              <div className="space-y-4 text-center py-8">
                <p className="text-lg font-semibold text-green-600">
                  {sessionSegments.length}문장 모두 완료!
                </p>
                <button
                  onClick={handleDictationDone}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  {vocabulary.length >= 4 ? '어휘 퀴즈 시작' : '학습 완료하기'}
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
      )}

      {phase === 'vocab_quiz' && (
        <VocabQuiz
          vocabulary={vocabulary}
          sessionSegmentRange={sessionSegmentRange}
          onComplete={handleQuizComplete}
        />
      )}

      {phase === 'completed' && (
        <div className="text-center space-y-4 py-8">
          <p className="text-lg font-semibold text-green-600">
            {sessionSegments.length}문장 받아쓰기 완료!
          </p>
          {quizResult && quizResult.totalQuestions > 0 && (
            <p className="text-sm text-gray-500">
              어휘 퀴즈: {quizResult.correctCount}/{quizResult.totalQuestions} ({quizResult.score}%)
            </p>
          )}
          <button
            onClick={handleSessionComplete}
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            학습 완료하기
          </button>
        </div>
      )}
    </div>
  );
}
