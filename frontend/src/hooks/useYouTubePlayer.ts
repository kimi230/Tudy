import { useEffect, useRef, useState, useCallback } from 'react';
import { loadYouTubeAPI, createPlayer } from '../lib/youtube';
import type { YouTubePlayerState } from '../types';

export function useYouTubePlayer(containerId: string, youtubeId: string) {
  const playerRef = useRef<YT.Player | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [state, setState] = useState<YouTubePlayerState>({
    isReady: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
  });

  useEffect(() => {
    let destroyed = false;

    loadYouTubeAPI().then(() => {
      if (destroyed) return;

      // Remove existing iframe if any
      const container = document.getElementById(containerId);
      if (container && container.tagName === 'IFRAME') {
        const wrapper = document.createElement('div');
        wrapper.id = containerId;
        container.parentNode?.replaceChild(wrapper, container);
      }

      playerRef.current = createPlayer(containerId, youtubeId, {
        onReady: (event) => {
          if (destroyed) return;
          setState((s) => ({
            ...s,
            isReady: true,
            duration: event.target.getDuration(),
          }));
        },
        onStateChange: (event) => {
          if (destroyed) return;
          const playing = event.data === window.YT.PlayerState.PLAYING;
          setState((s) => ({ ...s, isPlaying: playing }));
        },
      });
    });

    return () => {
      destroyed = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [containerId, youtubeId]);

  // Track current time while playing
  useEffect(() => {
    if (state.isPlaying) {
      intervalRef.current = window.setInterval(() => {
        if (playerRef.current) {
          const t = playerRef.current.getCurrentTime();
          setState((s) => ({ ...s, currentTime: t }));
        }
      }, 200);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isPlaying]);

  const play = useCallback(() => playerRef.current?.playVideo(), []);
  const pause = useCallback(() => playerRef.current?.pauseVideo(), []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
    setState((s) => ({ ...s, currentTime: seconds }));
  }, []);

  const setRate = useCallback((rate: number) => {
    playerRef.current?.setPlaybackRate(rate);
    setState((s) => ({ ...s, playbackRate: rate }));
  }, []);

  return { player: playerRef, state, play, pause, seekTo, setRate };
}
