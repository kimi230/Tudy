import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadCategories, loadVideos } from '../lib/dataLoader';
import type { Category, VideoEntry } from '../types';

const GOOGLE_FORM_URL = import.meta.env.VITE_GOOGLE_FORM_URL || 'https://forms.gle/mL7Sr2BTFA9e1ako6';

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<VideoEntry[]>([]);

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
        <button
          onClick={() => document.getElementById('videos')?.scrollIntoView({ behavior: 'smooth' })}
          className="group px-8 py-3.5 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200/50"
        >
          학습 시작하기
        </button>
      </section>

      {/* ──── 2. How it works — 3-Phase 개요 ──── */}
      <section>
        <h2 className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">
          How it works
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Phase A */}
          <div className="relative bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h2l4-4v14l-4-4z" />
                </svg>
              </span>
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Phase A</span>
                <h3 className="text-lg font-bold text-gray-900">듣기</h3>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              자막 없이 전체를 듣고, 키워드를 메모하고, 사각지대를 확인합니다.
            </p>
            <p className="text-xs text-gray-400 mt-3">1~3단계</p>
          </div>

          {/* Phase B */}
          <div className="relative bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow ring-2 ring-amber-200">
            <span className="absolute -top-3 left-6 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI 자동화
            </span>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </span>
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">Phase B</span>
                <h3 className="text-lg font-bold text-gray-900">분석</h3>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              번역, 어휘, 문법, 연음, 구조 분석을 AI가 자동으로 처리합니다.
            </p>
            <p className="text-xs text-gray-400 mt-3">4~6단계</p>
          </div>

          {/* Phase C */}
          <div className="relative bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </span>
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Phase C</span>
                <h3 className="text-lg font-bold text-gray-900">아웃풋</h3>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              쉐도잉, 녹음 비교, 내 말로 요약하기. 진짜 실력이 느는 단계입니다.
            </p>
            <p className="text-xs text-gray-400 mt-3">7~10단계</p>
          </div>
        </div>
      </section>

      {/* ──── 3. 10단계 한눈에 보기 ──── */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">10단계 한눈에 보기</h2>
        <p className="text-sm text-gray-400 text-center mb-8">
          자세한 설명은{' '}
          <Link to="/about" className="text-indigo-500 hover:text-indigo-700 underline underline-offset-2">
            소개 페이지
          </Link>
          에서 확인하세요.
        </p>
        <div className="max-w-2xl mx-auto space-y-2">
          {STEPS.map((s) => (
            <div key={s.step} className="flex items-center gap-3 group">
              <span
                className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white ${STEP_NUM_COLORS[s.phase]}`}
              >
                {s.step}
              </span>
              <span className="text-sm text-gray-800 group-hover:text-gray-900 transition-colors flex-1">
                {s.label}
              </span>
              {s.ai && (
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ──── 4. Value Prop: 분석의 벽 → Tudy가 해결 ──── */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">분석의 벽, Tudy가 해결</h2>
        <p className="text-sm text-gray-500 text-center mb-8 max-w-lg mx-auto">
          10단계 중 가장 시간이 오래 걸리는 분석 파트를 AI가 대신합니다.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* 사람이 하는 것 */}
          <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              사람이 하는 것
            </h3>
            <ul className="space-y-3">
              {[
                '자막 없이 집중해서 듣기',
                '키워드 메모 & 노트테이킹',
                '내가 뭘 못 알아들었는지 파악',
                '쉐도잉 & 발음 연습',
                '녹음해서 원본과 비교',
                '내 말로 요약하기',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Tudy가 하는 것 */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-6">
            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Tudy가 하는 것
            </h3>
            <ul className="space-y-3">
              {[
                '음성 자동 전사 (STT)',
                '한국어 번역 + 스피치 구조 분석',
                '핵심 어휘 · 어원 · 용례 추출',
                '구어체 문법 · 관용 표현 분석',
                '연음 패턴 자동 감지',
                '난이도 자동 추정',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ──── 5. 학습 카테고리 ──── */}
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

      {/* ──── 6. 최근 영상 ──── */}
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

      {/* ──── 7. CTA 신청 ──── */}
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

const STEPS: { step: number; label: string; phase: Phase; ai?: boolean }[] = [
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
