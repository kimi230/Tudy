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
import { supabase } from './supabase';
import { getDefaultLanguage } from './supabaseSync';

const BASE = import.meta.env.BASE_URL + 'data';

const cache = new Map<string, Promise<unknown>>();
const dbCache = new Map<string, Promise<unknown>>();

type LanguageCode = 'en' | 'zh' | 'ja';

interface VideoCatalogRow {
  video_id: string;
  youtube_id: string;
  title: string;
  channel: string;
  category_id: string;
  difficulty: string;
  duration: number;
  thumbnail: string;
  speech_rate_wpm: number;
  added_at: string | null;
  description_ko: string | null;
}

interface VideoArtifactsRow {
  meta: VideoMeta;
  segments: SegmentsData;
  vocabulary: VocabularyItem[];
  grammar: GrammarPattern[];
  connected_speech: ConnectedSpeech[];
  structure: SpeechStructure;
}

type CategoryTemplate = Omit<Category, 'id'>;

const CATEGORY_TEMPLATES: Record<LanguageCode, Record<string, CategoryTemplate>> = {
  en: {
    pronunciation: { name: '발음교정', icon: 'mic', description: '발음/억양 교정에 좋은 영상', order: 1 },
    business: { name: '비즈니스영어', icon: 'briefcase', description: '비즈니스 회의/이메일/프레젠테이션', order: 2 },
    daily: { name: '일상회화', icon: 'chat', description: '일상 대화, 생활 영어', order: 3 },
    academic: { name: '학술영어', icon: 'graduation', description: '학술 발표, 논문 영어', order: 4 },
    travel: { name: '여행영어', icon: 'plane', description: '여행/공항/호텔 상황 영어', order: 5 },
    tech: { name: 'IT·Tech', icon: 'code', description: '기술/IT 관련 영어', order: 6 },
    current: { name: '시사토론', icon: 'newspaper', description: '시사 이슈, 토론, 뉴스', order: 7 },
    culture: { name: '문화·예술', icon: 'palette', description: '문화, 예술, 엔터테인먼트', order: 8 },
    science: { name: '과학·교양', icon: 'flask', description: '과학, 교양, 다큐멘터리', order: 9 },
    motivation: { name: '동기부여', icon: 'fire', description: '동기부여, 자기계발, 성장', order: 10 },
  },
  zh: {
    daily: { name: '일상 회화', icon: '💬', description: '일상 중국어 표현과 회화', order: 1 },
    business: { name: '비즈니스', icon: '💼', description: '비즈니스 중국어', order: 2 },
    culture: { name: '문화', icon: '🏯', description: '중국 문화와 역사', order: 3 },
    news: { name: '뉴스', icon: '📰', description: '중국어 뉴스 청취', order: 4 },
    academic: { name: '학술', icon: '📚', description: '학술 중국어', order: 5 },
    travel: { name: '여행', icon: '✈️', description: '여행 중국어', order: 6 },
  },
  ja: {
    daily: { name: '일상 회화', icon: '💬', description: '일상 일본어 표현과 회화', order: 1 },
    business: { name: '비즈니스', icon: '💼', description: '비즈니스 일본어', order: 2 },
    culture: { name: '문화', icon: '⛩️', description: '일본 문화와 역사', order: 3 },
    news: { name: '뉴스', icon: '📰', description: '일본어 뉴스 청취', order: 4 },
    anime: { name: '애니/드라마', icon: '🎬', description: '애니메이션과 드라마 일본어', order: 5 },
    travel: { name: '여행', icon: '✈️', description: '여행 일본어', order: 6 },
  },
};

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

async function fetchDb<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const cached = dbCache.get(key);
  if (cached) return cached as Promise<T>;
  const promise = loader().catch((error) => {
    dbCache.delete(key);
    throw error;
  });
  dbCache.set(key, promise as Promise<unknown>);
  return promise;
}

function getLanguage(): LanguageCode {
  const lang = getDefaultLanguage();
  if (lang === 'zh' || lang === 'ja') return lang;
  return 'en';
}

function mapCatalogRow(row: VideoCatalogRow): VideoEntry {
  return {
    videoId: row.video_id,
    youtubeId: row.youtube_id,
    title: row.title,
    channel: row.channel,
    categoryId: row.category_id,
    difficulty: row.difficulty as VideoEntry['difficulty'],
    duration: row.duration ?? 0,
    thumbnail: row.thumbnail ?? '',
    speechRateWpm: row.speech_rate_wpm ?? 0,
    addedAt: row.added_at ?? '',
    descriptionKo: row.description_ko ?? undefined,
  };
}

function buildCategoriesFromVideos(videos: VideoEntry[], lang: LanguageCode): Category[] {
  const templates = CATEGORY_TEMPLATES[lang];
  const categoryIds = [...new Set(videos.map((v) => v.categoryId))];
  const categories = categoryIds.map((id, idx) => {
    const template = templates[id];
    if (template) return { id, ...template };
    return {
      id,
      name: id,
      icon: '📚',
      description: `${id} videos`,
      order: 100 + idx,
    };
  });
  categories.sort((a, b) => a.order - b.order);
  return categories;
}

export async function loadCategories() {
  if (supabase) {
    const videos = await loadVideos();
    if (videos.length > 0) {
      return buildCategoriesFromVideos(videos, getLanguage());
    }
  }
  return fetchJSON<Category[]>('categories.json');
}

export async function loadVideos() {
  const lang = getLanguage();
  const sb = supabase;
  if (sb) {
    try {
      const rows = await fetchDb(`videos:${lang}`, async () => {
        const { data, error } = await sb
          .from('video_catalog')
          .select(
            [
              'video_id',
              'youtube_id',
              'title',
              'channel',
              'category_id',
              'difficulty',
              'duration',
              'thumbnail',
              'speech_rate_wpm',
              'added_at',
              'description_ko',
            ].join(','),
          )
          .eq('language', lang)
          .order('added_at', { ascending: false });

        if (error) throw error;
        return ((data ?? []) as unknown) as VideoCatalogRow[];
      });

      if (rows.length > 0) {
        const mapped = rows.map(mapCatalogRow);
        const needsDescriptionBackfill = mapped.some((video) => !video.descriptionKo);

        if (!needsDescriptionBackfill) {
          return mapped;
        }

        try {
          const localVideos = await fetchJSON<VideoEntry[]>('videos.json');
          const localDescriptionMap = new Map(
            localVideos
              .filter((video) => typeof video.descriptionKo === 'string' && video.descriptionKo.trim().length > 0)
              .map((video) => [video.videoId, video.descriptionKo as string]),
          );

          return mapped.map((video) =>
            video.descriptionKo
              ? video
              : { ...video, descriptionKo: localDescriptionMap.get(video.videoId) },
          );
        } catch {
          return mapped;
        }
      }
    } catch (error) {
      console.warn('Falling back to local video JSON:', error);
    }
  }

  return fetchJSON<VideoEntry[]>('videos.json');
}

async function loadVideoArtifactsFromDb(videoId: string): Promise<VideoArtifactsRow | null> {
  const sb = supabase;
  if (!sb) return null;
  const lang = getLanguage();
  try {
    const row = await fetchDb(`artifact:${lang}:${videoId}`, async () => {
      const { data, error } = await sb
        .from('video_artifacts')
        .select('meta,segments,vocabulary,grammar,connected_speech,structure')
        .eq('language', lang)
        .eq('video_id', videoId)
        .maybeSingle();

      if (error) throw error;
      return ((data ?? null) as unknown) as VideoArtifactsRow | null;
    });
    return row;
  } catch (error) {
    console.warn(`Falling back to local JSON for ${videoId}:`, error);
    return null;
  }
}

export async function loadVideoMeta(videoId: string) {
  const row = await loadVideoArtifactsFromDb(videoId);
  if (row?.meta) return row.meta;
  return fetchJSON<VideoMeta>(`${videoId}/meta.json`);
}

export async function loadSegments(videoId: string) {
  const row = await loadVideoArtifactsFromDb(videoId);
  if (row?.segments) return row.segments;
  return fetchJSON<SegmentsData>(`${videoId}/segments.json`);
}

export async function loadVocabulary(videoId: string) {
  const row = await loadVideoArtifactsFromDb(videoId);
  if (row?.vocabulary) return row.vocabulary;
  return fetchJSON<VocabularyItem[]>(`${videoId}/vocabulary.json`);
}

export async function loadGrammar(videoId: string) {
  const row = await loadVideoArtifactsFromDb(videoId);
  if (row?.grammar) return row.grammar;
  return fetchJSON<GrammarPattern[]>(`${videoId}/grammar.json`);
}

export async function loadConnectedSpeech(videoId: string) {
  const row = await loadVideoArtifactsFromDb(videoId);
  if (row?.connected_speech) return row.connected_speech;
  return fetchJSON<ConnectedSpeech[]>(`${videoId}/connected_speech.json`);
}

export async function loadStructure(videoId: string) {
  const row = await loadVideoArtifactsFromDb(videoId);
  if (row?.structure) return row.structure;
  return fetchJSON<SpeechStructure>(`${videoId}/structure.json`);
}

/** Load all video artifacts in a single DB query, with per-field JSON fallback. */
export async function loadAllArtifacts(videoId: string) {
  const row = await loadVideoArtifactsFromDb(videoId);
  const [segments, vocabulary, grammar, connectedSpeech, structure] = await Promise.all([
    row?.segments ? Promise.resolve(row.segments) : fetchJSON<SegmentsData>(`${videoId}/segments.json`),
    row?.vocabulary ? Promise.resolve(row.vocabulary) : fetchJSON<VocabularyItem[]>(`${videoId}/vocabulary.json`).catch(() => [] as VocabularyItem[]),
    row?.grammar ? Promise.resolve(row.grammar) : fetchJSON<GrammarPattern[]>(`${videoId}/grammar.json`).catch(() => [] as GrammarPattern[]),
    row?.connected_speech ? Promise.resolve(row.connected_speech) : fetchJSON<ConnectedSpeech[]>(`${videoId}/connected_speech.json`).catch(() => [] as ConnectedSpeech[]),
    row?.structure ? Promise.resolve(row.structure) : fetchJSON<SpeechStructure>(`${videoId}/structure.json`).catch(() => undefined),
  ]);
  return { segments, vocabulary, grammar, connectedSpeech, structure };
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
