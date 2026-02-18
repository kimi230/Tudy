import { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useYouTubePlayer } from '../../hooks/useYouTubePlayer';
import { formatTime } from '../../lib/dataLoader';

export interface YouTubePlayerHandle {
  pause: () => void;
  play: () => void;
  seekTo: (seconds: number) => void;
}

interface Props {
  youtubeId: string;
  onTimeUpdate?: (time: number) => void;
  onReady?: () => void;
  className?: string;
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, Props>(function YouTubePlayer(
  { youtubeId, onTimeUpdate, onReady, className },
  ref
) {
  const containerId = `yt-player-${youtubeId}`;
  const { state, play, pause, seekTo, setRate } = useYouTubePlayer(containerId, youtubeId);

  useImperativeHandle(ref, () => ({ pause, play, seekTo }), [pause, play, seekTo]);

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
          className="w-9 h-9 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label={state.isPlaying ? '일시정지' : '재생'}
        >
          {state.isPlaying ? '⏸' : '▶'}
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
});

export default YouTubePlayer;
