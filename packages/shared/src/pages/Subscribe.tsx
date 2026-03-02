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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Minimal top bar */}
      <header className="max-w-3xl mx-auto px-4 pt-6 pb-2 flex items-center justify-between">
        <Link to="/" className={`text-sm font-medium text-gray-500 ${t.hoverText600} transition-colors`}>
          &larr; {langLabel} 학습 홈
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 space-y-16">
        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
            AI가 분석한<br />
            <span className={t.text600}>{langLabel} 학습 자료</span>를 받아보세요
          </h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            YouTube 영상을 기반으로 어휘, 문법, 발음을 정리한 학습 가이드를 무료로 보내드립니다.
          </p>
        </section>

        {/* What's included */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 text-center">학습 가이드에 포함되는 내용</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: '📝', title: '전체 스크립트 + 번역', desc: '원문과 한국어 번역을 대조하며 학습' },
              { icon: '📚', title: '핵심 어휘 정리', desc: '빈도순 어휘 목록, 뜻, 예문 포함' },
              { icon: '🔤', title: '문법 포인트', desc: '영상에서 나온 주요 문법 패턴 해설' },
              { icon: '🎯', title: '난이도 분석', desc: 'CEFR 기준 난이도와 학습 포인트' },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-gray-200 rounded-xl p-4 space-y-1">
                <div className="text-2xl">{item.icon}</div>
                <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sample download */}
        <section className="text-center space-y-4">
          <h2 className="text-xl font-bold text-gray-900">샘플 학습 가이드</h2>
          <p className="text-sm text-gray-500">실제 영상에서 생성된 학습 가이드를 미리 확인해 보세요.</p>
          <div className="flex items-center justify-center gap-3">
            <a
              href={`${import.meta.env.BASE_URL}data/${sampleId}/study_guide.pdf`}
              download
              className={`inline-flex items-center gap-2 px-6 py-3 ${t.bg600} text-white rounded-full text-sm font-semibold ${t.hoverBg700} active:scale-95 transition-all shadow-lg ${t.shadow200}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF 다운로드
            </a>
            <a
              href={`${import.meta.env.BASE_URL}data/${sampleId}/study_guide.html`}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 ${t.hoverBorder300} ${t.hoverText600} active:scale-95 transition-all`}
            >
              웹에서 보기
            </a>
          </div>
        </section>

        {/* Email form */}
        <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-gray-900">무료 학습 자료 구독</h2>
            <p className="text-sm text-gray-500">
              새로운 학습 가이드와 업데이트 소식을 이메일로 받아보세요.
            </p>
          </div>

          {status === 'success' ? (
            <div className="text-center py-6 space-y-2">
              <div className="text-4xl">🎉</div>
              <p className="text-lg font-semibold text-gray-900">구독이 완료되었습니다!</p>
              <p className="text-sm text-gray-500">새로운 학습 자료가 준비되면 이메일로 알려드릴게요.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 주소
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
                  placeholder="you@example.com"
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-sm ${t.focusBorder500} ${t.focusRing500} focus:ring-1 outline-none transition-colors`}
                />
              </div>

              {status === 'duplicate' && (
                <p className="text-sm text-amber-600">이미 구독 중인 이메일입니다.</p>
              )}
              {status === 'error' && (
                <p className="text-sm text-red-600">오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className={`w-full py-3 ${t.bg600} text-white rounded-lg text-sm font-semibold ${t.hoverBg700} active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {status === 'loading' ? '구독 중...' : '무료로 구독하기'}
              </button>
            </form>
          )}
        </section>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 pb-8">
          스팸 없이, 학습 자료만 보내드립니다. 언제든 구독 취소 가능합니다.
        </p>
      </main>
    </div>
  );
}
