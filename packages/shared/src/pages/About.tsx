import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-xl mx-auto px-6 pt-12 sm:pt-20 pb-20">
        {/* Back */}
        <Link to="/" className="inline-block text-sm text-gray-400 hover:text-gray-600 transition-colors mb-16 sm:mb-20">
          &larr; 홈으로
        </Link>

        {/* Hero */}
        <div className="mb-20 sm:mb-28">
          <p className="text-xs tracking-[0.2em] uppercase text-gray-400 font-medium mb-4">
            About Tudy
          </p>
          <h1 className="text-[2.5rem] sm:text-6xl font-extrabold text-gray-900 leading-[1.08] tracking-tight mb-6">
            이 프로젝트가<br />
            만들어진 이유.
          </h1>
          <p className="text-base sm:text-lg text-gray-400 leading-relaxed">
            유튜버 한 분의 영상을 보고, 영어 공부를 다시 시작했습니다.<br className="hidden sm:block" />
            그리고 그 학습법의 가장 고통스러운 단계를 자동화하기로 했습니다.
          </p>
        </div>

        {/* Story */}
        <article className="space-y-20 sm:space-y-28">

          {/* 1. Discovery */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">시작은 하나의 영상</h2>
            <div className="space-y-4 text-[15px] text-gray-600 leading-[1.8]">
              <p>
                <strong className="text-gray-900">미국회사직장인</strong>이라는 유튜버의 영상을 우연히 봤습니다.
                통번역학과 출신으로, 수능 영어 4등급에서 1년 만에 통역을 하게 된 분입니다.
              </p>
              <p>
                대학에서 만난 교수님이 알려준 방법 — <strong className="text-gray-900">TED 10단계 학습법</strong>.
                10년 넘게 학원 다니고, 미드 보고, EBS 들어도 귀가 안 뚫리던 분에게
                처음으로 "영어가 느는구나"를 느끼게 해준 방법이었습니다.
              </p>
            </div>

            <blockquote className="border-l-[3px] border-gray-300 pl-5 my-8">
              <p className="text-[15px] text-gray-500 italic leading-[1.8]">
                "성인이 돼서 그냥 듣는 것만으로 귀가 트이길 바란다면,
                아예 다시 태어나야 합니다."
              </p>
              <p className="text-xs text-gray-400 mt-2">— 통번역학과 교수님</p>
            </blockquote>

            <a
              href="https://www.youtube.com/@kglobaltechgirl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-red-500 text-xs font-bold">
                ▶
              </span>
              미국회사직장인 (K Global Tech Girl) &rarr;
            </a>
          </section>

          {/* 2. Why TED */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">왜 TED인가</h2>
            <div className="space-y-4 text-[15px] text-gray-600 leading-[1.8]">
              <p>
                미드나 영화는 길고, 고르는 데만 시간이 걸리고, 자극적인 스토리에 빠져 공부는 뒷전이 되기 쉽습니다.
              </p>
              <p>
                TED는 <strong className="text-gray-900">7~10분</strong>이면 끝납니다.
                잘못 골라도 다음 주에 바꾸면 됩니다.
                연구와 책을 바탕으로 한 명확한 구조, 실전에서 쓸 만한 표현,
                스피커의 사고방식까지 자연스럽게 흡수하게 됩니다.
              </p>
              <p>
                60~80% 정도 이해할 수 있는 수준의 영상이 장기 학습에 가장 효과적입니다.
                언어학에서 말하는 <strong className="text-gray-900">Comprehensible Input</strong> 원리입니다.
              </p>
            </div>
          </section>

          {/* 3. 10 Steps */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">10단계 학습법</h2>
            <p className="text-[15px] text-gray-400 mb-10">
              듣기 &rarr; 분석 &rarr; 아웃풋. 본인에 맞게 압축하거나 응용해도 됩니다.
            </p>

            {/* Phase A */}
            <div className="mb-14">
              <p className="text-xs tracking-[0.15em] uppercase text-indigo-400 font-medium mb-6">
                A &middot; 듣기
              </p>
              <div className="space-y-6">
                <Step n={1} title="그냥 듣기" color="indigo">
                  자막 없이 전체를 듣습니다. 모르는 것에 집착하지 않고, 흐름과 주제만 파악합니다.
                </Step>
                <Step n={2} title="노트테이킹하며 듣기" color="indigo">
                  키워드, 시그널 표현, 스피치 구조를 메모합니다.
                  딕테이션이 아니라 핵심 키워드 위주 — 노트테이킹은 중심을 파악하는 도구입니다.
                </Step>
                <Step n={3} title="다시 들으며 보충" color="indigo">
                  놓친 부분을 다른 색으로 표시합니다. 청취 사각지대가 시각적으로 드러납니다.
                </Step>
              </div>
            </div>

            {/* Phase B */}
            <div className="mb-14">
              <p className="text-xs tracking-[0.15em] uppercase text-amber-400 font-medium mb-6">
                B &middot; 분석
              </p>
              <div className="space-y-6">
                <Step n={4} title="자막 켜고 대조" color="amber">
                  노트와 실제 스크립트를 비교합니다.
                  전환 표현과 논증 흐름, 어디까지가 서론이고 어디서 본론이 시작되는지 분석합니다.
                </Step>
                <Step n={5} title="안 들린 원인 분석" color="amber">
                  영어가 안 들리는 원인은 보통 세 가지 — 모르는 어휘, 구어체 문법, 연음 패턴.
                  모든 단어를 외우려 하지 말고, 중심 내용에 필수적인 단어만 선별합니다.
                </Step>
                <Step n={6} title="자막 끄고 직청직해" color="amber">
                  분석한 내용을 바탕으로 다시 자막 없이 들어봅니다.
                  내가 어느 파트가 유독 취약한지 파악하는 게 핵심입니다.
                </Step>
              </div>
            </div>

            {/* Phase C */}
            <div className="mb-6">
              <p className="text-xs tracking-[0.15em] uppercase text-emerald-400 font-medium mb-6">
                C &middot; 아웃풋
              </p>
              <div className="space-y-6">
                <Step n={7} title="오답노트 정리" color="emerald">
                  안 들렸던 어휘, 문법, 연음을 한 곳에 정리합니다.
                </Step>
                <Step n={8} title="쉐도잉" color="emerald">
                  스크립트를 보며 천천히, 그 다음 원어민 속도로.
                  앞 단계의 분석 없이 하는 쉐도잉은 외계어를 따라 하는 것과 같습니다.
                </Step>
                <Step n={9} title="녹음 & 점검" color="emerald">
                  자신의 발음을 녹음하고 원본과 비교합니다.
                  가장 하기 싫은 작업이지만, 하고 안 하고가 천지차이입니다.
                </Step>
                <Step n={10} title="내 말로 요약하기" color="emerald">
                  배운 내용을 자기 말로 요약합니다.
                  직접 써보는 Active Learning은 수동 암기보다 2배 이상 효과적입니다.
                </Step>
              </div>
            </div>
          </section>

          {/* 4. The Wall */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">분석의 벽</h2>
            <div className="space-y-4 text-[15px] text-gray-600 leading-[1.8]">
              <p>
                10단계 중 가장 시간이 오래 걸리는 건 <strong className="text-gray-900">4~5단계, 분석 파트</strong>입니다.
                스크립트를 구하고, 구조를 파악하고, 어휘와 문법과 연음을 분류하는 작업은
                한 영상에 수 시간이 걸릴 수 있습니다.
              </p>
              <p>
                이 방법이 효과적이라는 건 알겠는데,
                분석 과정이 너무 고통스러워서 포기하는 사람이 대부분입니다.
              </p>
              <p className="text-gray-900 font-semibold">
                바로 이 지점이 Tudy가 태어난 이유입니다.
              </p>
            </div>
          </section>

          {/* 5. What Tudy Does */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">Tudy가 하는 일</h2>
            <div className="space-y-4 text-[15px] text-gray-600 leading-[1.8] mb-10">
              <p>
                Tudy는 분석 단계를 자동화합니다.
                한국어 번역, 스피치 구조 분석, 핵심 어휘와 어원, 문법 패턴, 연음 감지, 난이도 추정까지 —
                사람이 해야 할 듣기와 쉐도잉과 아웃풋에 집중할 수 있도록, 기계적 분석을 대신합니다.
              </p>
            </div>
            <blockquote className="border-l-[3px] border-indigo-400 pl-5">
              <p className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
                분석은 기계가,<br />
                훈련은 사람이.
              </p>
            </blockquote>
          </section>

          {/* 6. Principles */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">핵심 원칙</h2>
            <p className="text-[15px] text-gray-400 mb-10">
              채널 영상들에서 반복적으로 강조된 것들.
            </p>
            <div className="space-y-10">
              <Principle title="WHY가 먼저다">
                방법론보다 중요한 건 "왜 영어를 하고 싶은가"입니다.
                컨퍼런스에서 네트워킹하는 나, 인터뷰에서 자유롭게 답변하는 나를 상상해 보세요.
              </Principle>
              <Principle title="모든 걸 다 알려고 하지 마세요">
                모르는 단어에 집착하면 전체를 놓칩니다.
                해외에서 살아도 모르는 표현은 항상 나오지만, 중심을 잡으면 맥락으로 이해할 수 있습니다.
              </Principle>
              <Principle title="인풋과 아웃풋을 동시에">
                빨리 배우려면 빨리 실패해야 합니다.
                준비만 하다가 말을 안 하면 영원히 말하기는 늘지 않습니다.
              </Principle>
              <Principle title="내 문장을 만드세요">
                회화책 표현 대신, 내가 실제로 쓰는 표현을 영어로 만들어 보세요.
                내 일상에서 나오는 것들로 학습해야 외우려 하지 않아도 외워집니다.
              </Principle>
              <Principle title="계단식 성장을 믿으세요">
                "못 해먹겠다" 싶은 순간, 머지않아 느는 걸 느끼게 됩니다.
                일주일에 한 시간이라도 제대로 된 방법으로 하면 무조건 늡니다.
              </Principle>
            </div>
          </section>

          {/* 7. Sources */}
          <section className="border-t border-gray-100 pt-14 sm:pt-20">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">출처</h2>
            <p className="text-[15px] text-gray-400 mb-8">
              모든 크레딧은 미국회사직장인 님께 있습니다.
            </p>
            <div className="space-y-2">
              {[
                { id: '0TI4O81gwhQ', title: 'TED로 집요하게 영어실력 높인 방법 (10단계 루틴)', dur: '45분' },
                { id: 'I4S_sREzf4k', title: 'TED 영어공부법 Q&A', dur: '23분' },
                { id: 'y9Xkxp6CVyc', title: '국내파 영어 1년만에 통역하게되기까지 한 것', dur: '11분' },
                { id: '4SkRMwsTQeE', title: '영어 공부할 때 가장 먼저 해야하는 것', dur: '11분' },
                { id: '7qiTpEON9bo', title: '제로베이스에서 6개월 안에 원어민과 대화하기', dur: '14분' },
                { id: '5BOJaFrUlX8', title: '1달만에 효과 본 영어말하기 혼자 연습법', dur: '8분' },
              ].map((v) => (
                <a
                  key={v.id}
                  href={`https://www.youtube.com/watch?v=${v.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
                >
                  <span className="text-red-400 text-xs">▶</span>
                  <span className="flex-1 min-w-0 truncate group-hover:text-gray-900">{v.title}</span>
                  <span className="shrink-0 text-xs text-gray-300">{v.dur}</span>
                </a>
              ))}
            </div>
          </section>

          {/* Footer */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-300 mb-3">
              TED뿐만 아니라 모든 YouTube 영상에 동일한 10단계를 적용할 수 있습니다.
            </p>
            <Link
              to="/updates"
              className="text-sm text-gray-400 hover:text-gray-600 hover:underline underline-offset-2 transition-colors"
            >
              업데이트 기록 &rarr;
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}

/* ---- Sub-components ---- */

function Step({ n, title, color = 'gray', children }: { n: number; title: string; color?: 'indigo' | 'amber' | 'emerald' | 'gray'; children: React.ReactNode }) {
  const styles = {
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    gray: 'bg-gray-100 text-gray-500',
  };
  return (
    <div className="flex gap-4">
      <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${styles[color]}`}>
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-[15px] mb-1">{title}</p>
        <p className="text-[15px] text-gray-500 leading-[1.8]">{children}</p>
      </div>
    </div>
  );
}

function Principle({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-gray-900 text-[15px] mb-1">{title}</p>
      <p className="text-[15px] text-gray-500 leading-[1.8]">{children}</p>
    </div>
  );
}
