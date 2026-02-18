import type {
  Category,
  VideoEntry,
  VideoMeta,
  SegmentsData,
  VocabularyItem,
  GrammarPattern,
  ConnectedSpeech,
  SpeechStructure,
} from '../types';

const BASE = import.meta.env.BASE_URL + 'data';

const cache = new Map<string, Promise<unknown>>();

async function fetchJSON<T>(path: string): Promise<T> {
  const cached = cache.get(path);
  if (cached) return cached as Promise<T>;
  const promise = fetch(`${BASE}/${path}`).then((res) => {
    if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
    return res.json();
  });
  cache.set(path, promise);
  return promise as Promise<T>;
}

export function loadCategories() {
  return fetchJSON<Category[]>('categories.json');
}

export function loadVideos() {
  return fetchJSON<VideoEntry[]>('videos.json');
}

export function loadVideoMeta(videoId: string) {
  return fetchJSON<VideoMeta>(`${videoId}/meta.json`);
}

export function loadSegments(videoId: string) {
  return fetchJSON<SegmentsData>(`${videoId}/segments.json`);
}

export function loadVocabulary(videoId: string) {
  return fetchJSON<VocabularyItem[]>(`${videoId}/vocabulary.json`);
}

export function loadGrammar(videoId: string) {
  return fetchJSON<GrammarPattern[]>(`${videoId}/grammar.json`);
}

export function loadConnectedSpeech(videoId: string) {
  return fetchJSON<ConnectedSpeech[]>(`${videoId}/connected_speech.json`);
}

export function loadStructure(videoId: string) {
  return fetchJSON<SpeechStructure>(`${videoId}/structure.json`);
}

export async function loadVideosByCategory(categoryId: string) {
  const videos = await loadVideos();
  return videos.filter((v) => v.categoryId === categoryId);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const formatTime = formatDuration;

export function getDifficultyLabel(d: string): string {
  switch (d) {
    case 'beginner': return '초급';
    case 'intermediate': return '중급';
    case 'advanced': return '고급';
    default: return d;
  }
}
