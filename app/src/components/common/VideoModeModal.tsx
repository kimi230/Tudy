import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { loadSegments } from '../../lib/dataLoader';
import { setActiveDailyVideo } from '../../lib/dailyLearningSync';
import type { VideoEntry } from '../../types';

interface Props {
  video: VideoEntry | null;
  onClose: () => void;
}

export default function VideoModeModal({ video, onClose }: Props) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [settingDaily, setSettingDaily] = useState(false);

  if (!video) return null;

  const isLoggedIn = !!auth.user;

  const handleSetDaily = async () => {
    if (!auth.user || !video) return;
    setSettingDaily(true);
    try {
      const data = await loadSegments(video.videoId);
      await setActiveDailyVideo(auth.user.id, video.videoId, data.segments.length);
      onClose();
      navigate('/daily');
    } catch {
      // offline or error
    } finally {
      setSettingDaily(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full aspect-video object-cover"
        />
        <div className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
            {video.title}
          </h3>
          {isLoggedIn ? (
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => { onClose(); navigate(`/study/${video.videoId}`); }}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  10단계 학습
                </button>
                <button
                  onClick={() => { onClose(); navigate(`/dictation/${video.videoId}`); }}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 active:scale-95 transition-all"
                >
                  딕테이션
                </button>
              </div>
              <button
                onClick={handleSetDaily}
                disabled={settingDaily}
                className="w-full py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50"
              >
                {settingDaily ? '설정 중...' : '오늘의 학습 지정'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 text-center">학습을 시작하려면 로그인이 필요합니다.</p>
              <button
                onClick={() => auth.signInWithGoogle()}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
              >
                Google로 로그인
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
