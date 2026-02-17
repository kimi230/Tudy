import { useNavigate } from 'react-router-dom';
import type { VideoEntry } from '../../types';

interface Props {
  video: VideoEntry | null;
  onClose: () => void;
}

export default function VideoModeModal({ video, onClose }: Props) {
  const navigate = useNavigate();

  if (!video) return null;

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
        </div>
      </div>
    </div>
  );
}
