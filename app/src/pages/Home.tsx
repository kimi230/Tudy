import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadCategories, loadVideos } from '../lib/dataLoader';
import type { Category, VideoEntry } from '../types';

const GOOGLE_FORM_URL = import.meta.env.VITE_GOOGLE_FORM_URL || 'https://forms.gle/mL7Sr2BTFA9e1ako6';

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    loadCategories().then(setCategories);
    loadVideos().then(setVideos);
  }, []);

  const countByCategory = (catId: string) => videos.filter((v) => v.categoryId === catId).length;

  return (
    <div className="space-y-20">
      {/* ──── 1. Hero ──── */}
      <section className="text-center pt-12 pb-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          YouTube로 배우는
          <br />
          <span className="text-indigo-600">10단계</span> 영어 학습
        </h1>
        <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto mb-8">
          분석은 AI가, 훈련은 내가.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => document.getElementById('videos')?.scrollIntoView({ behavior: 'smooth' })}
            className="group px-8 py-3.5 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200/50"
          >
            학습 시작하기
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="px-5 py-3.5 bg-white text-gray-600 border border-gray-200 rounded-full text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 active:scale-95 transition-all"
          >
            10단계 학습이란?
          </button>
        </div>
      </section>

      {/* ──── 10단계 소개 팝업 ──── */}
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

            <h2 className="text-xl font-bold text-gray-900 mb-1">10단계 영어 학습법</h2>
            <p className="text-sm text-gray-500 mb-5">듣기 → 분석 → 아웃풋, 세 파트로 구성됩니다.</p>

            {/* Phase A */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">Phase A &middot; 듣기</h3>
              <div className="space-y-1.5">
                {STEPS.filter((s) => s.phase === 'indigo').map((s) => (
                  <StepRow key={s.step} step={s} />
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
                  <StepRow key={s.step} step={s} />
                ))}
              </div>
            </div>

            {/* Phase C */}
            <div className="mb-5">
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">Phase C &middot; 아웃풋</h3>
              <div className="space-y-1.5">
                {STEPS.filter((s) => s.phase === 'emerald').map((s) => (
                  <StepRow key={s.step} step={s} />
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">
                가장 시간이 오래 걸리는 분석 파트를 AI가 대신합니다.
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link
                to="/about"
                className="text-sm text-indigo-500 hover:text-indigo-700 underline underline-offset-2"
                onClick={() => setShowGuide(false)}
              >
                자세한 소개 보기
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ──── 2. 학습 카테고리 ──── */}
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

      {/* ──── 3. 최근 영상 ──── */}
      {videos.length > 0 && (
        <section id="videos">
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

      {/* ──── 4. CTA 신청 ──── */}
      <section className="bg-gray-50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">영상 신청하기</h2>
        <p className="text-sm text-gray-500 mb-4">학습하고 싶은 YouTube 영상이 있나요? 아래 버튼을 눌러 신청해 주세요.</p>
        <a
          href={GOOGLE_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          신청하러 가기
        </a>
      </section>
    </div>
  );
}

/* ──── Constants ──── */

type Phase = 'indigo' | 'amber' | 'emerald';

const STEP_NUM_COLORS: Record<Phase, string> = {
  indigo: 'bg-indigo-600',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-600',
};

type StepItem = { step: number; label: string; phase: Phase; ai?: boolean };

const STEPS: StepItem[] = [
  { step: 1, label: '자막 없이 전체 듣기', phase: 'indigo' },
  { step: 2, label: '키워드 노트테이킹하며 듣기', phase: 'indigo' },
  { step: 3, label: '다시 들으며 놓친 부분 보충', phase: 'indigo' },
  { step: 4, label: '자막 켜고 구조 분석 · 번역 대조', phase: 'amber', ai: true },
  { step: 5, label: '어휘 · 문법 · 연음 원인 분석', phase: 'amber', ai: true },
  { step: 6, label: '자막 끄고 직청직해 확인', phase: 'amber' },
  { step: 7, label: '오답노트 정리', phase: 'emerald' },
  { step: 8, label: '스크립트 보며 쉐도잉', phase: 'emerald' },
  { step: 9, label: '녹음 & 원본 비교', phase: 'emerald' },
  { step: 10, label: '내 말로 요약하기', phase: 'emerald' },
];

function StepRow({ step: s }: { step: StepItem }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold text-white ${STEP_NUM_COLORS[s.phase]}`}
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
