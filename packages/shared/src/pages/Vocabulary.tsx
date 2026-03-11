import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { loadVideos, loadVocabulary } from '../lib/dataLoader';
import VocabCard from '../components/vocabulary/VocabCard';
import VocabDetailView from '../components/vocabulary/VocabDetailView';
import VocabPractice from '../components/vocabulary/VocabPractice';
import { getThemeColors } from '../lib/languageHelpers';
import type { VocabularyItem, VideoEntry } from '../types';

interface VocabWithSource extends VocabularyItem {
  videoTitle: string;
  videoId: string;
}

export default function Vocabulary() {
  const location = useLocation();
  const initialPracticeId = (location.state as { practiceVideoId?: string } | null)?.practiceVideoId ?? null;
  const [allVocab, setAllVocab] = useState<VocabWithSource[]>([]);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [selectedWord, setSelectedWord] = useState<VocabWithSource | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [practiceVideoId, setPracticeVideoId] = useState<string | null>(initialPracticeId);
  const t = getThemeColors();

  useEffect(() => {
    (async () => {
      const loadedVideos = await loadVideos();
      setVideos(loadedVideos);
      const vocabPromises = loadedVideos.map(async (v: VideoEntry) => {
        try {
          const vocab = await loadVocabulary(v.videoId);
          return vocab.map((item) => ({ ...item, videoTitle: v.title, videoId: v.videoId }));
        } catch {
          return [];
        }
      });
      const results = await Promise.all(vocabPromises);
      setAllVocab(results.flat());
      setLoading(false);
    })();
  }, []);

  const videoMap = useMemo(() => {
    const m = new Map<string, VideoEntry>();
    for (const v of videos) m.set(v.videoId, v);
    return m;
  }, [videos]);

  const filtered = useMemo(() => {
    if (!search) return allVocab;
    const q = search.toLowerCase();
    return allVocab.filter(
      (v) =>
        v.word.toLowerCase().includes(q) ||
        v.koreanMeaning.includes(search) ||
        v.definition.toLowerCase().includes(q)
    );
  }, [allVocab, search]);

  const groupedByVideo = useMemo(() => {
    const groups = new Map<string, VocabWithSource[]>();
    for (const v of filtered) {
      const list = groups.get(v.videoId);
      if (list) list.push(v);
      else groups.set(v.videoId, [v]);
    }
    return groups;
  }, [filtered]);

  const toggleCollapse = (videoId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  };

  const practiceVocab = useMemo(() => {
    if (!practiceVideoId) return [];
    return allVocab.filter((v) => v.videoId === practiceVideoId);
  }, [allVocab, practiceVideoId]);

  if (loading) {
    return <div className="text-center py-20 text-gray-400">어휘 데이터를 불러오는 중...</div>;
  }

  if (practiceVideoId) {
    const video = videoMap.get(practiceVideoId);
    return (
      <div className="max-w-2xl mx-auto">
        <VocabPractice
          vocabulary={practiceVocab}
          videoTitle={video?.title ?? practiceVideoId}
          onClose={() => setPracticeVideoId(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">어휘장</h1>
        <p className="text-gray-500 mt-1">학습한 영상들에서 추출된 핵심 어휘 {allVocab.length}개</p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="단어, 뜻, 정의로 검색..."
        className={`w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 ${t.focusRing500} ${t.focusBorder500}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {groupedByVideo.size === 0 ? (
            <p className="text-center py-16 text-gray-400">
              {allVocab.length === 0 ? '아직 어휘 데이터가 없습니다' : '검색 결과가 없습니다'}
            </p>
          ) : (
            [...groupedByVideo.entries()].map(([videoId, vocabItems]) => {
              const video = videoMap.get(videoId);
              const isCollapsed = collapsed.has(videoId);
              return (
                <div key={videoId} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
                    <button
                      onClick={() => toggleCollapse(videoId)}
                      className="flex-1 flex items-center gap-3 hover:bg-gray-100 rounded-lg transition-colors text-left -ml-1 pl-1 py-0.5"
                    >
                      {video?.thumbnail && (
                        <img src={video.thumbnail} alt="" className="w-16 h-10 object-cover rounded flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{video?.title ?? videoId}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {video?.channel}<span className="mx-1.5">·</span>어휘 {vocabItems.length}개
                        </p>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setPracticeVideoId(videoId)}
                      disabled={vocabItems.length < 4}
                      className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        vocabItems.length < 4
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : `${t.bg600} ${t.hoverBg700} text-white`
                      }`}
                    >
                      단어 연습
                    </button>
                  </div>
                  {!isCollapsed && (
                    <div className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {vocabItems.map((v, i) => (
                          <VocabCard key={`${v.videoId}-${i}`} item={v} onClick={() => setSelectedWord(v)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {selectedWord && (
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              <VocabDetailView item={selectedWord} />
              <div className="text-xs text-gray-400">출처: {selectedWord.videoTitle}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
