import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getDefaultLanguage } from '../lib/supabaseSync';
import { getLanguageLabel, getThemeColors } from '../lib/languageHelpers';

const SAMPLE_VIDEO_ID: Record<string, string> = {
  en: 'LNHBMFCzznE',
  zh: '2K88pWCimZg',
  ja: '0gvHwBXuwQ0',
};

export default function Subscribe() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>('idle');
  const lang = getDefaultLanguage();
  const langLabel = getLanguageLabel();
  const t = getThemeColors();
  const sampleId = SAMPLE_VIDEO_ID[lang] ?? SAMPLE_VIDEO_ID.en;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !supabase) return;

    setStatus('loading');
    const { error } = await supabase
      .from('email_subscribers')
      .insert({ email: email.trim().toLowerCase(), language: lang });

    if (error) {
      if (error.code === '23505') {
        setStatus('duplicate');
      } else {
        console.error('Subscribe error:', error);
        setStatus('error');
      }
    } else {
      setStatus('success');
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-xl mx-auto px-6 pt-12 sm:pt-20 pb-20">
        {/* Back */}
        <Link to="/" className="inline-block text-sm text-gray-400 hover:text-gray-600 transition-colors mb-16 sm:mb-20">
          &larr; 홈으로
        </Link>

        {/* Hero */}
        <div className="mb-14 sm:mb-20">
          <p className="text-xs tracking-[0.2em] uppercase text-gray-400 font-medium mb-4">
            Free Study Guide
          </p>
          <h1 className="text-[2.5rem] sm:text-6xl font-extrabold text-gray-900 leading-[1.08] tracking-tight mb-6">
            YouTube 한 편이면<br />
            <span className={t.text600}>충분합니다.</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-sm">
            영상 속 어휘, 문법, 발음을 AI가 분석해서<br className="hidden sm:block" />
            학습 가이드로 만들어 드립니다.
          </p>
        </div>

        {/* What you get — pills, not card grid */}
        <div className="flex flex-wrap gap-2.5 mb-14 sm:mb-20">
          {['스크립트 + 번역', '핵심 어휘', '문법 패턴', '발음 분석', '난이도 평가'].map((f) => (
            <span
              key={f}
              className="px-4 py-2 rounded-full text-[13px] font-medium text-gray-600 bg-gray-50 border border-gray-100"
            >
              {f}
            </span>
          ))}
        </div>

        {/* Sample — minimal left-border callout */}
        <div className={`border-l-[3px] ${t.border600} pl-5 mb-14 sm:mb-20`}>
          <p className="text-sm text-gray-500 mb-2">먼저 확인해 보세요</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              href={`${import.meta.env.BASE_URL}data/${sampleId}/study_guide.pdf`}
              download
              className={`text-sm font-semibold ${t.text600} hover:underline underline-offset-2`}
            >
              샘플 PDF 다운로드 &rarr;
            </a>
            <a
              href={`${import.meta.env.BASE_URL}data/${sampleId}/study_guide.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-gray-600 hover:underline underline-offset-2 transition-colors"
            >
              웹에서 보기
            </a>
          </div>
        </div>

        {/* Email CTA */}
        {status === 'success' ? (
          <div className="py-10">
            <p className={`text-2xl font-bold ${t.text600} mb-2`}>구독 완료!</p>
            <p className="text-sm text-gray-400">
              새 학습 가이드가 준비되면 바로 보내드릴게요.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              이메일로 받아보기
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              새 가이드가 나올 때마다 보내드립니다. 광고 없음.
            </p>
            <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
                placeholder="you@example.com"
                className={`flex-1 min-w-0 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder:text-gray-300 ${t.focusBorder500} focus:ring-1 ${t.focusRing500} focus:bg-white outline-none transition-all`}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className={`px-5 sm:px-7 py-3 ${t.bg600} text-white rounded-xl text-sm font-semibold ${t.hoverBg700} active:scale-[0.97] transition-all disabled:opacity-50 whitespace-nowrap`}
              >
                {status === 'loading' ? '...' : '구독'}
              </button>
            </form>
            {status === 'duplicate' && (
              <p className="text-sm text-amber-600">이미 구독 중인 이메일이에요.</p>
            )}
            {status === 'error' && (
              <p className="text-sm text-red-500">잠시 후 다시 시도해 주세요.</p>
            )}
            {status === 'idle' && (
              <p className="text-xs text-gray-300">스팸 없음 · 언제든 구독 취소</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
