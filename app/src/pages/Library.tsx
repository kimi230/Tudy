import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllSessionsFromCloud } from '../lib/supabaseSync';
import { useAuth } from '../hooks/useAuth';
import { loadVideos } from '../lib/dataLoader';
import RequireAuth from '../components/auth/RequireAuth';
import Spinner from '../components/common/Spinner';
import ProgressBar from '../components/common/ProgressBar';
import type { StudySession, VideoEntry } from '../types';

export default function Library() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = useAuth();
  const userId = auth.user?.id;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    Promise.all([
      getAllSessionsFromCloud(userId).then(setSessions),
      loadVideos().then(setVideos),
    ]).finally(() => setLoading(false));
  }, [userId]);

  const getVideo = (videoId: string) => videos.find((v) => v.videoId === videoId);

  const getProgress = (session: StudySession) => {
    const completed = Object.values(session.stepStatus).filter((s) => s === 'completed').length;
    return (completed / 10) * 100;
  };

  const sortedSessions = sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return (
    <RequireAuth message="학습 기록을 보려면 로그인이 필요합니다.">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">내 학습</h1>
        <p className="text-gray-500 mt-1">지금까지의 학습 기록을 확인하세요.</p>
      </div>

      {sortedSessions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">아직 학습 기록이 없습니다</p>
          <p className="text-sm">
            <Link to="/" className="text-indigo-600 hover:underline">영상을 선택</Link>하고 학습을 시작하세요!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSessions.map((session) => {
            const video = getVideo(session.videoId);
            const progress = getProgress(session);
            return (
              <Link
                key={session.id}
                to={`/study/${session.videoId}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {video && (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-32 aspect-video object-cover rounded shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                      {video?.title || session.videoId}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(session.startedAt).toLocaleDateString('ko-KR')} 시작
                      {session.completedAt && ' · 완료'}
                    </p>
                    <ProgressBar value={progress} label={`Step ${session.currentStep}/10`} className="mt-3" />
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>학습 시간: {Math.floor(session.totalStudyTimeSec / 60)}분</span>
                      {session.selfScore > 0 && <span>이해도: {session.selfScore}%</span>}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
      )}
    </RequireAuth>
  );
}
