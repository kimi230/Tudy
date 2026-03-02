import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadCategories, loadVideos } from '../lib/dataLoader';
import VideoModeModal from '../components/common/VideoModeModal';
import { getLanguageLabel, getConnectedSpeechLabel, getThemeColors } from '../lib/languageHelpers';
import { getDefaultLanguage } from '../lib/supabaseSync';
import type { Category, VideoEntry } from '../types';

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoEntry | null>(null);
  const t = getThemeColors();
  const lang = getDefaultLanguage();
  const langLabel = getLanguageLabel();
  const connectedSpeechLabel = getConnectedSpeechLabel();

  useEffect(() => {
    loadCategories().then(setCategories);
    loadVideos().then(setVideos);
  }, []);

  const countByCategory = (catId: string) => videos.filter((v) => v.categoryId === catId).length;

  // Phase colors per language
  const phaseA = lang === 'en' ? 'indigo' as const : lang === 'zh' ? 'red' as const : 'pink' as const;

  type Phase = 'indigo' | 'red' | 'pink' | 'amber' | 'emerald';

  const STEP_NUM_COLORS: Record<Phase, string> = {
    indigo: 'bg-indigo-600',
    red: 'bg-red-600',
    pink: 'bg-pink-600',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-600',
  };

  const PHASE_HEADER_COLORS: Record<Phase, string> = {
    indigo: 'text-indigo-600',
    red: 'text-red-600',
    pink: 'text-pink-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
  };

  type StepItem = { step: number; label: string; phase: Phase; ai?: boolean };

  const STEPS: StepItem[] = [
    { step: 1, label: '자막 없이 전체 듣기', phase: phaseA },
    { step: 2, label: '키워드 노트테이킹하며 듣기', phase: phaseA },
    { step: 3, label: '다시 들으며 놓친 부분 보충', phase: phaseA },
    { step: 4, label: '자막 켜고 구조 분석 · 번역 대조', phase: 'amber', ai: true },
    { step: 5, label: `어휘 · 문법 · ${connectedSpeechLabel} 원인 분석`, phase: 'amber', ai: true },
    { step: 6, label: '자막 끄고 직청직해 확인', phase: 'amber' },
    { step: 7, label: '오답노트 정리', phase: 'emerald' },
    { step: 8, label: '스크립트 보며 쉐도잉', phase: 'emerald' },
    { step: 9, label: '녹음 & 원본 비교', phase: 'emerald' },
    { step: 10, label: '내 말로 요약하기', phase: 'emerald' },
  ];

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="text-center pt-12 pb-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          YouTube로 배우는
          <br />
          <span className={t.text600}>10단계</span> {langLabel} 학습
        </h1>
        <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto mb-8">
          분석은 AI가, 훈련은 내가.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/daily"
            className="group px-8 py-3.5 bg-emerald-500 text-white rounded-full text-sm font-semibold hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-200/50"
          >
            오늘의 학습 시작하기
          </Link>
          <Link
            to="/vocabulary"
            className={`px-5 py-3.5 bg-white text-gray-600 border border-gray-200 rounded-full text-sm font-medium ${t.hoverBorder300} ${t.hoverText600} active:scale-95 transition-all`}
          >
            단어 연습
          </Link>
          <button
            onClick={() => setShowGuide(true)}
            className={`px-5 py-3.5 bg-white text-gray-600 border border-gray-200 rounded-full text-sm font-medium ${t.hoverBorder300} ${t.hoverText600} active:scale-95 transition-all`}
          >
            10단계 학습이란?
          </button>
        </div>
        <div className="mt-5">
          <Link
            to="/subscribe"
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 border-2 ${t.border600} ${t.text600} rounded-full text-sm font-semibold ${t.hoverBg600} hover:text-white active:scale-95 transition-all`}
          >
            무료 학습자료 받기
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </Link>
        </div>
      </section>

      {/* 10단계 소개 팝업 */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowGuide(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-1">10단계 {langLabel} 학습법</h2>
            <p className="text-sm text-gray-500 mb-5">듣기 → 분석 → 아웃풋, 세 파트로 구성됩니다.</p>

            {/* Phase A */}
            <div className="mb-4">
              <h3 className={`text-xs font-bold ${PHASE_HEADER_COLORS[phaseA]} uppercase tracking-wide mb-2`}>Phase A &middot; 듣기</h3>
              <div className="space-y-1.5">
                {STEPS.filter((s) => s.phase === phaseA).map((s) => (
                  <StepRow key={s.step} step={s} colors={STEP_NUM_COLORS} />
                ))}
              </div>
            </div>

            {/* Phase B */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                Phase B &middot; 분석
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                  AI 자동화
                </span>
              </h3>
              <div className="space-y-1.5">
                {STEPS.filter((s) => s.phase === 'amber').map((s) => (
                  <StepRow key={s.step} step={s} colors={STEP_NUM_COLORS} />
                ))}
              </div>
            </div>

            {/* Phase C */}
            <div className="mb-5">
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">Phase C &middot; 아웃풋</h3>
              <div className="space-y-1.5">
                {STEPS.filter((s) => s.phase === 'emerald').map((s) => (
                  <StepRow key={s.step} step={s} colors={STEP_NUM_COLORS} />
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">가장 시간이 오래 걸리는 분석 파트를 AI가 대신합니다.</p>
            </div>

            {lang === 'en' && (
              <div className="mt-4 text-center">
                <Link
                  to="/about"
                  className="text-sm text-indigo-500 hover:text-indigo-700 underline underline-offset-2"
                  onClick={() => setShowGuide(false)}
                >
                  자세한 소개 보기
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 학습 카테고리 */}
      {categories.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">학습 카테고리</h2>
          <div className="flex flex-wrap gap-2">
            {categories
              .sort((a, b) => a.order - b.order)
              .map((cat) => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.id}`}
                  className={`inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:shadow-md ${t.hoverBorder300} transition-all group`}
                >
                  <span className={`text-sm font-medium text-gray-900 ${t.groupHoverText600} transition-colors`}>
                    {cat.name}
                  </span>
                  <span className="text-xs text-gray-400">{countByCategory(cat.id)}</span>
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* 최근 영상 */}
      {videos.length > 0 && (
        <section id="videos">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">최근 추가된 영상</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(showAll ? videos : videos.slice(0, 6)).map((v) => (
              <div
                key={v.videoId}
                onClick={() => setSelectedVideo(v)}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                <img src={v.thumbnail} alt={v.title} className="w-full aspect-video object-cover" />
                <div className="p-3">
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{v.title}</h4>
                  {v.descriptionKo && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{v.descriptionKo}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{v.channel}</p>
                </div>
              </div>
            ))}
          </div>
          {videos.length > 6 && (
            <div className="text-center mt-6">
              <button
                onClick={() => setShowAll((prev) => !prev)}
                className={`px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 ${t.hoverBorder300} ${t.hoverText600} transition-all`}
              >
                {showAll ? '접기' : `더보기 (${videos.length - 6}개)`}
              </button>
            </div>
          )}
        </section>
      )}

      <VideoModeModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </div>
  );
}

function StepRow({ step: s, colors }: { step: { step: number; label: string; phase: string; ai?: boolean }; colors: Record<string, string> }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold text-white ${colors[s.phase]}`}
      >
        {s.step}
      </span>
      <span className="text-sm text-gray-700 flex-1">{s.label}</span>
      {s.ai && (
        <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
          AI
        </span>
      )}
    </div>
  );
}
