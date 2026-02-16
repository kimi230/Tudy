declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

let apiLoaded = false;
let apiLoadingPromise: Promise<void> | null = null;

export function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded && window.YT?.Player) return Promise.resolve();

  if (apiLoadingPromise) return apiLoadingPromise;

  apiLoadingPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      apiLoaded = true;
      resolve();
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      resolve();
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });

  return apiLoadingPromise;
}

export function createPlayer(
  elementId: string,
  videoId: string,
  options?: {
    width?: number;
    height?: number;
    onReady?: (event: YT.PlayerEvent) => void;
    onStateChange?: (event: YT.OnStateChangeEvent) => void;
  }
): YT.Player {
  return new window.YT.Player(elementId, {
    videoId,
    width: options?.width ?? 640,
    height: options?.height ?? 360,
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      cc_load_policy: 0,
      iv_load_policy: 3,
    },
    events: {
      onReady: options?.onReady,
      onStateChange: options?.onStateChange,
    },
  });
}

export function seekToSegment(player: YT.Player, startTime: number) {
  player.seekTo(startTime, true);
  player.playVideo();
}

export function setPlaybackRate(player: YT.Player, rate: number) {
  player.setPlaybackRate(rate);
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
