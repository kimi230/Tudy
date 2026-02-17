import { useState, useEffect, useMemo } from 'react';
import { loadVideos } from '../../lib/dataLoader';
import type { VideoEntry } from '../../types';
import type { DailyLearningProgress } from '../../lib/dailyLearningSync';
import DifficultyBadge from '../common/DifficultyBadge';

interface Props {
  allProgress: DailyLearningProgress[];
  onSelect: (video: VideoEntry, totalSegments: number) => void;
}

export default function DailyVideoSelector({ allProgress, onSelect }: Props) {
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos()
      .then(setVideos)
      .finally(() => setLoading(false));
  }, []);

  // Build a map of videoId -> progress
  const progressMap = useMemo(() => {
    const map = new Map<string, DailyLearningProgress>();
    for (const p of allProgress) {
      map.set(p.videoId, p);
    }
    return map;
  }, [allProgress]);

  // Categorize videos
  const { unstarted, inProgress, completed } = useMemo(() => {
    const unstarted: VideoEntry[] = [];
    const inProgress: VideoEntry[] = [];
    const completed: VideoEntry[] = [];

    for (const v of videos) {
      const p = progressMap.get(v.videoId);
      if (!p) {
        unstarted.push(v);
      } else if (p.completedAt) {
        completed.push(v);
      } else {
        inProgress.push(v);
      }
    }
    return { unstarted, inProgress, completed };
  }, [videos, progressMap]);

  const pickRandom = () => {
    // Prefer unstarted videos, fallback to in-progress
    const pool = unstarted.length > 0 ? unstarted : inProgress;
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    // Use segmentCount from progress or estimate (we'll load actual count in workflow)
    const existing = progressMap.get(pick.videoId);
    onSelect(pick, existing?.totalSegments ?? 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-gray-900">오늘의 학습</h1>
        <p className="text-sm text-gray-500">매일 10문장씩 딕테이션으로 영어 실력을 키워보세요</p>
      </div>

      {/* Random recommendation */}
      {(unstarted.length > 0 || inProgress.length > 0) && (
        <div className="text-center">
          <button
            onClick={pickRandom}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
          >
            랜덤 추천으로 시작하기
          </button>
        </div>
      )}

      {/* In-progress videos */}
      {inProgress.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">진행 중인 영상</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inProgress.map((v) => (
              <VideoCard
                key={v.videoId}
                video={v}
                progress={progressMap.get(v.videoId)!}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      )}

      {/* Unstarted videos */}
      {unstarted.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">새로운 영상</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unstarted.map((v) => (
              <VideoCard
                key={v.videoId}
                video={v}
                progress={undefined}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed videos */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">완료한 영상</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {completed.map((v) => (
              <VideoCard
                key={v.videoId}
                video={v}
                progress={progressMap.get(v.videoId)!}
                onSelect={onSelect}
                isCompleted
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function VideoCard({
  video,
  progress,
  onSelect,
  isCompleted,
}: {
  video: VideoEntry;
  progress?: DailyLearningProgress;
  onSelect: (video: VideoEntry, totalSegments: number) => void;
  isCompleted?: boolean;
}) {
  const pct = progress && progress.totalSegments > 0
    ? Math.round((progress.nextSegmentIndex / progress.totalSegments) * 100)
    : 0;

  return (
    <button
      onClick={() => onSelect(video, progress?.totalSegments ?? 0)}
      className={`w-full text-left bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md active:scale-[0.98] transition-all ${
        isCompleted ? 'opacity-60 border-gray-200' : 'border-gray-200'
      }`}
    >
      <div className="relative">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full aspect-video object-cover"
        />
        {isCompleted && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
              완료
            </span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{video.title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{video.channel}</span>
          <DifficultyBadge difficulty={video.difficulty} />
        </div>
        {progress && progress.totalSegments > 0 && (
          <div className="space-y-1">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-indigo-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400">
              {progress.nextSegmentIndex} / {progress.totalSegments} 문장 ({pct}%)
            </p>
          </div>
        )}
      </div>
    </button>
  );
}
