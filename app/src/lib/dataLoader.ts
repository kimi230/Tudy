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

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
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
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function getDifficultyLabel(d: string): string {
  switch (d) {
    case 'beginner': return '초급';
    case 'intermediate': return '중급';
    case 'advanced': return '고급';
    default: return d;
  }
}
