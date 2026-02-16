import { useEffect } from 'react';
import { useYouTubePlayer } from '../../hooks/useYouTubePlayer';

interface Props {
  youtubeId: string;
  onTimeUpdate?: (time: number) => void;
  onReady?: () => void;
  className?: string;
}

export default function YouTubePlayer({ youtubeId, onTimeUpdate, onReady, className }: Props) {
  const containerId = `yt-player-${youtubeId}`;
  const { state, play, pause, seekTo, setRate } = useYouTubePlayer(containerId, youtubeId);

  useEffect(() => {
    if (state.isReady && onReady) onReady();
  }, [state.isReady, onReady]);

  useEffect(() => {
    if (onTimeUpdate && state.isPlaying) {
      onTimeUpdate(state.currentTime);
    }
  }, [state.currentTime, state.isPlaying, onTimeUpdate]);

  return (
    <div className={className}>
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <div id={containerId} className="w-full h-full" />
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={state.isPlaying ? pause : play}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {state.isPlaying ? '일시정지' : '재생'}
        </button>
        <select
          value={state.playbackRate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="px-2 py-2 border border-gray-300 rounded-lg text-sm"
        >
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
            <option key={r} value={r}>{r}x</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">
          {formatTime(state.currentTime)} / {formatTime(state.duration)}
        </span>
      </div>
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}
