import { useEffect, useState } from 'react';
import { loadVideos, loadVocabulary } from '../lib/dataLoader';
import VocabCard from '../components/vocabulary/VocabCard';
import EtymologyView from '../components/vocabulary/EtymologyView';
import type { VocabularyItem, VideoEntry } from '../types';

interface VocabWithSource extends VocabularyItem {
  videoTitle: string;
  videoId: string;
}

export default function Vocabulary() {
  const [allVocab, setAllVocab] = useState<VocabWithSource[]>([]);
  const [selectedWord, setSelectedWord] = useState<VocabWithSource | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const videos = await loadVideos();
      const vocabPromises = videos.map(async (v: VideoEntry) => {
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

  const filtered = allVocab.filter(
    (v) =>
      v.word.toLowerCase().includes(search.toLowerCase()) ||
      v.koreanMeaning.includes(search) ||
      v.definition.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-20 text-gray-400">어휘 데이터를 불러오는 중...</div>;
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
        className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {filtered.length === 0 ? (
            <p className="text-center py-16 text-gray-400">
              {allVocab.length === 0 ? '아직 어휘 데이터가 없습니다' : '검색 결과가 없습니다'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((v, i) => (
                <VocabCard key={`${v.videoId}-${i}`} item={v} onClick={() => setSelectedWord(v)} />
              ))}
            </div>
          )}
        </div>

        {selectedWord && (
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              <EtymologyView item={selectedWord} />
              <div className="text-xs text-gray-400">
                출처: {selectedWord.videoTitle}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
