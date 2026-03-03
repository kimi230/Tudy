import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadCategories, loadVideosByCategory, formatDuration } from '../lib/dataLoader';
import DifficultyBadge from '../components/common/DifficultyBadge';
import VideoModeModal from '../components/common/VideoModeModal';
import { getThemeColors } from '../lib/languageHelpers';
import { getDefaultLanguage } from '../lib/supabaseSync';
import type { Category as CategoryType, VideoEntry } from '../types';

export default function Category() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [category, setCategory] = useState<CategoryType | null>(null);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoEntry | null>(null);
  const t = getThemeColors();
  const lang = getDefaultLanguage();

  useEffect(() => {
    if (!categoryId) return;
    loadCategories().then((cats) => {
      setCategory(cats.find((c) => c.id === categoryId) || null);
    });
    loadVideosByCategory(categoryId).then(setVideos);
  }, [categoryId]);

  if (!category) {
    return <div className="text-center py-20 text-gray-400">카테고리를 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className={`text-sm ${t.text600} hover:underline`}>← 홈으로</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{category.name}</h1>
        <p className="text-gray-500">{category.description}</p>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">아직 영상이 없습니다</p>
          {lang === 'en' && (
            <p className="text-sm">
              <Link to="/request" className={`${t.text600} hover:underline`}>영상을 신청</Link>해보세요!
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div
              key={v.videoId}
              onClick={() => setSelectedVideo(v)}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            >
              <img src={v.thumbnail} alt={v.title} className="w-full aspect-video object-cover" />
              <div className="p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{v.title}</h3>
                {v.descriptionKo && (
                  <p className="text-xs text-gray-500">{v.descriptionKo}</p>
                )}
                <p className="text-xs text-gray-400">{v.channel}</p>
                <div className="flex items-center gap-2">
                  <DifficultyBadge difficulty={v.difficulty} />
                  <span className="text-xs text-gray-400">{formatDuration(v.duration)}</span>
                  {lang === 'en' && v.speechRateWpm && (
                    <span className="text-xs text-gray-400">{v.speechRateWpm} WPM</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <VideoModeModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </div>
  );
}
