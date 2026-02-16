import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadCategories, loadVideos } from '../lib/dataLoader';
import type { Category, VideoEntry } from '../types';


export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [requestUrl, setRequestUrl] = useState('');

  useEffect(() => {
    loadCategories().then(setCategories);
    loadVideos().then(setVideos);
  }, []);

  const countByCategory = (catId: string) => videos.filter((v) => v.categoryId === catId).length;

  const handleRequest = () => {
    if (!requestUrl.trim()) return;
    const requests = JSON.parse(localStorage.getItem('stdyeng-requests') || '[]');
    requests.push({ url: requestUrl, createdAt: new Date().toISOString(), status: 'pending' });
    localStorage.setItem('stdyeng-requests', JSON.stringify(requests));
    setRequestUrl('');
    alert('신청이 완료되었습니다!');
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          YouTube로 배우는 <span className="text-indigo-600">10단계</span> 영어 학습
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          TED 강연 10단계 공부법을 기반으로, 듣기 → 분석 → 쉐도잉/아웃풋 과정을 체계적으로 학습하세요.
        </p>
      </section>

      {/* Categories */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">학습 카테고리</h2>
        <div className="flex flex-wrap gap-2">
          {categories
            .sort((a, b) => a.order - b.order)
            .map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.id}`}
                className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:shadow-md hover:border-indigo-300 transition-all group"
              >
                <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {cat.name}
                </span>
                <span className="text-xs text-gray-400">{countByCategory(cat.id)}</span>
              </Link>
            ))}
        </div>
      </section>

      {/* Recent videos */}
      {videos.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">최근 추가된 영상</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.slice(0, 6).map((v) => (
              <Link
                key={v.videoId}
                to={`/study/${v.videoId}`}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  className="w-full aspect-video object-cover"
                />
                <div className="p-3">
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{v.title}</h4>
                  <p className="text-xs text-gray-400 mt-1">{v.channel}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick request */}
      <section className="bg-gray-50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">영상 신청하기</h2>
        <p className="text-sm text-gray-500 mb-4">학습하고 싶은 YouTube 영상이 있나요? URL을 신청하면 24시간 내 추가됩니다.</p>
        <div className="flex gap-3 max-w-lg">
          <input
            type="url"
            value={requestUrl}
            onChange={(e) => setRequestUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={handleRequest}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            신청
          </button>
        </div>
      </section>
    </div>
  );
}
