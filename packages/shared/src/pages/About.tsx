import { Link } from 'react-router-dom';

export default function About() {
  return (
    <article className="max-w-3xl mx-auto py-4">
      {/* Header */}
      <header className="mb-10">
        <p className="text-sm text-indigo-600 font-medium mb-2">프로젝트 이야기</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
          이 프로젝트가<br />
          만들어진 이유
        </h1>
        <p className="text-gray-500 text-lg">
          유튜버 한 분의 영상을 보고, 영어 공부를 다시 시작하게 됐습니다.
          그리고 그 분이 알려준 학습법의 가장 고통스러운 단계를 자동화하기로 했습니다.
        </p>
      </header>

      <div className="prose prose-gray max-w-none space-y-12">
        {/* Section 1: Discovery Story */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">시작은 하나의 영상이었습니다</h2>
          <p className="text-gray-700 leading-relaxed">
            <strong>미국회사직장인</strong>이라는 유튜버의 영상을 우연히 보게 됐습니다.
            통번역학과 출신으로, 수능 영어 4등급에서 1년 만에 통역을 하게 된 분입니다.
            대학에서 만난 교수님이 알려주신 방법이 바로 <strong>TED 10단계 학습법</strong> —
            10년 넘게 학원 다니고, 미드 보고, EBS 듣고도 귀가 뚫리지 않던 그 분에게
            처음으로 "영어 실력이 느는구나"를 느끼게 해준 방법입니다.
          </p>
          <blockquote className="border-l-4 border-indigo-400 bg-indigo-50/50 px-5 py-4 my-6 rounded-r-lg">
            <p className="text-gray-800 italic">
              "성인이 돼서 그냥 듣는 것만으로 귀가 트이길 바란다면, 아예 다시 태어나야 합니다.
              직접 해외에서 살면서 실험해 봤지만, 아무것도 안 하고 듣기만 해서는 귀가 트이지 않습니다."
            </p>
            <p className="text-sm text-gray-500 mt-2">— 통번역학과 교수님</p>
          </blockquote>

          {/* Source Card */}
          <a
            href="https://www.youtube.com/@kglobaltechgirl"
            target="_blank"
            rel="noopener noreferrer"
            className="block no-underline"
          >
            <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
              <div className="shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-lg font-bold">▶</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">미국회사직장인 (K Global Tech Girl)</p>
                <p className="text-gray-500 text-xs mt-0.5">영어 학습법 · 직장인 영어 · 해외 커리어</p>
              </div>
            </div>
          </a>
        </section>

        {/* Section 2: Why TED */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">왜 TED인가</h2>
          <p className="text-gray-700 leading-relaxed">
            미드나 영화는 1~2시간짜리에, 고르는 데만 시간이 걸리고, 자극적인 스토리에 빠져 공부는 뒷전이 되기 쉽습니다.
            TED 강연은 다릅니다.
          </p>
          <ul className="mt-4 space-y-3">
            {[
              { title: '짧은 길이 (7~10분)', desc: '잘못 골라도 다음 주에 바꾸면 됩니다. 부담이 없습니다.' },
              { title: '탄탄한 구조', desc: '연구 결과와 책을 바탕으로 한 명확한 서론-본론-결론. 메시지가 뚜렷합니다.' },
              { title: '사고방식이 담긴다', desc: '스피커들의 말하는 방식과 사고 방식을 자연스럽게 흡수하게 됩니다.' },
              { title: '실전 표현', desc: '발표, 비즈니스, 일상 — 실제 영어 환경에서 쓸 만한 단어와 표현이 가득합니다.' },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5" />
                <div>
                  <span className="font-semibold text-gray-900">{item.title}</span>
                  <span className="text-gray-600 ml-1">— {item.desc}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-gray-700 leading-relaxed mt-4">
            60~80% 정도 이해할 수 있는 수준의 영상을 고르면 장기 학습에 훨씬 효과적입니다.
            이것이 언어학에서 말하는 <strong>Comprehensible Input</strong>(이해 가능한 입력) 원리입니다.
            너무 어려우면 BBC Learning English 같은 학습자용 콘텐츠부터 시작해도 됩니다.
          </p>
        </section>

        {/* Section 3: 10 Steps */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10단계 학습법</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            10단계는 크게 세 가지 파트로 구성됩니다: <strong>듣기</strong>, <strong>분석</strong>, <strong>쉐도잉 & 활용</strong>.
            이 프레임워크를 10단계로 쪼갠 것뿐이지, 본인에 맞게 압축하거나 응용해도 됩니다.
            <strong> 나만의 정답을 찾아가는 게 제일 중요합니다.</strong>
          </p>

          {/* Part 1 */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">A</span>
              제대로 듣기 (1~3단계)
            </h3>
            <div className="space-y-4">
              <StepCard step={1} title="그냥 듣기" color="indigo">
                자막 없이 편하게 전체를 듣습니다.
                모르는 것에 집착하지 않고, 전체 흐름과 주제만 파악합니다.
              </StepCard>
              <StepCard step={2} title="노트테이킹하며 듣기" color="indigo">
                키워드, 시그널 표현(<em>"So here's what I found"</em>, <em>"The important thing is"</em>),
                스피치 구조(서론/본론/결론)를 메모합니다.
                딕테이션(전부 따라쓰기)이 아니라 <strong>핵심 키워드</strong> 위주로 —
                노트테이킹은 중심을 파악하는 도구이지, 그 자체가 연습이 되어서는 안 됩니다.
              </StepCard>
              <StepCard step={3} title="다시 들으며 보충" color="indigo">
                2회차에서 놓친 부분을 다른 색으로 표시합니다.
                자신의 청취 사각지대가 시각적으로 드러납니다.
              </StepCard>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              핵심: 안 들리는 구간에 매달리지 말고, <strong>중심 내용을 추적</strong>하세요.
              모르는 단어에 집착하면 전체를 놓칩니다.
            </p>
          </div>

          {/* Part 2 */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-amber-700 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-sm font-bold">B</span>
              분석하기 (4~6단계)
            </h3>
            <div className="space-y-4">
              <StepCard step={4} title="자막 켜고 대조" color="amber">
                노트와 실제 스크립트를 비교합니다.
                스피치의 전체 구조 — 어디까지가 서론이고 어디서 본론이 시작되는지,
                전환 표현과 논증 흐름을 분석합니다.
              </StepCard>
              <StepCard step={5} title="안 들린 원인 분석" color="amber">
                영어가 안 들리는 원인은 보통 세 가지입니다:
                <span className="mt-2 flex flex-wrap gap-2">
                  <Badge color="blue">어휘 — 모르는 단어</Badge>
                  <Badge color="green">문법 — 구어체·파괴 문법</Badge>
                  <Badge color="purple">연음 — 자음+모음 결합</Badge>
                </span>
                <span className="block mt-2">
                  어원(etymology)을 활용하면 1개 단어에서 파생어까지 함께 익힐 수 있습니다.
                  예: <em>vulnerability → vulnerable</em>.
                  모든 단어를 다 외우려 하지 말고, 중심 내용 파악에 필수적인 단어만 선별하세요.
                </span>
              </StepCard>
              <StepCard step={6} title="자막 끄고 재확인 — 직청직해" color="amber">
                분석한 내용을 바탕으로 다시 자막 없이 들어봅니다.
                <strong>직청직해</strong>(듣고 바로 이해) — 한 문장씩 "이게 무슨 뜻이었지?" 즉시 검증합니다.
                공부한 직후라 당연히 잘 들리겠지만, 핵심은 <strong>내가 어느 파트가 유독 취약한지</strong> 파악하는 것입니다.
              </StepCard>
            </div>
          </div>

          {/* Part 3 */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-emerald-700 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">C</span>
              쉐도잉 & 내 것으로 만들기 (7~10단계)
            </h3>
            <div className="space-y-4">
              <StepCard step={7} title="오답노트 정리" color="emerald">
                안 들렸던 어휘·문법·연음을 한 곳에 정리합니다.
                이 습관 하나만으로도 학습 효율이 크게 올라갑니다.
              </StepCard>
              <StepCard step={8} title="쉐도잉" color="emerald">
                스크립트를 보며 천천히 → 원어민 속도로 따라 말합니다.
                인토네이션, 강세까지 연기하듯 모방하세요.
                <strong> 앞 단계의 분석 없이 하는 쉐도잉은 "외계어를 따라 하는 것"과 같습니다.</strong>
                {' '}이해가 있는 상태에서 말해야 절대 안 늘 수가 없습니다.
              </StepCard>
              <StepCard step={9} title="녹음 & 점검" color="emerald">
                자신의 발음을 녹음하고 원본과 비교합니다.
                가장 하기 싫고 듣기 싫은 작업이지만, 하고 안 하고가 발음·인토네이션에서 천지차이입니다.
                전체를 녹음할 필요 없이, 좋아하는 1~3분 구간만으로도 충분합니다.
              </StepCard>
              <StepCard step={10} title="요약하여 말해보기" color="emerald">
                배운 내용을 자기 말로 요약합니다.
                아이토키/전화영어로 토론하거나, 혼자 요약해도 됩니다.
                직접 써보는 <strong>Active Learning</strong>은 수동 암기보다 2배 이상의 기억 효과가 있습니다.
              </StepCard>
            </div>
          </div>
        </section>

        {/* Section 4: The Wall — Analysis Barrier */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">분석의 벽</h2>
          <p className="text-gray-700 leading-relaxed">
            10단계 중 가장 시간이 오래 걸리고 진입장벽이 높은 구간은 <strong>4~5단계, 분석 파트</strong>입니다.
            스크립트를 구하고, 구조를 파악하고, 어휘·문법·연음을 하나하나 분류하는 작업은
            한 영상에 수 시간이 걸릴 수 있습니다.
          </p>
          <p className="text-gray-700 leading-relaxed mt-3">
            채널의 구독자들도 가장 많이 질문한 부분이 바로 이 분석 단계였습니다:
            "노트테이킹 어떻게 하나요?", "안 들린 원인을 어떻게 분석하나요?", "분량은 어떻게 나누나요?"
          </p>
          <p className="text-gray-700 leading-relaxed mt-3">
            이 방법이 효과적이라는 건 알겠는데, <strong>분석 과정이 너무 고통스러워서 포기하는 사람이 대부분</strong>입니다.
            바로 이 지점이 Tudy가 태어난 이유입니다.
          </p>
        </section>

        {/* Section 5: What Tudy Does */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">그래서 Tudy가 하는 일</h2>
          <p className="text-gray-700 leading-relaxed">
            <strong>Tudy는 분석 단계를 자동화합니다.</strong>{' '}
            사람이 해야 할 듣기·쉐도잉·아웃풋에 집중할 수 있도록, 기계적 분석을 대신합니다.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 pr-4 text-gray-500 font-medium">학습법 단계</th>
                  <th className="text-left py-3 pr-4 text-gray-500 font-medium">Tudy 자동화</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { step: '4단계: 자막 대조 + 구조 분석', auto: '한국어 번역 + 스피치 구조 분석' },
                  { step: '5단계: 어휘 분석', auto: '핵심 단어, 어원, 용례 자동 추출' },
                  { step: '5단계: 문법 분석', auto: '구어체 문법, 관용 표현 분석' },
                  { step: '5단계: 연음 분석', auto: '자음+모음 결합 패턴 자동 감지' },
                  { step: '난이도 선택', auto: '영상별 난이도 자동 추정' },
                ].map((row) => (
                  <tr key={row.step}>
                    <td className="py-3 pr-4 text-gray-700">{row.step}</td>
                    <td className="py-3 pr-4 text-indigo-700 font-medium">{row.auto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 text-center">
            <p className="text-lg font-semibold text-gray-900">
              분석은 기계가, 훈련은 사람이.
            </p>
            <p className="text-gray-600 mt-2 text-sm">
              기계가 대신할 수 없는 듣기·쉐도잉·아웃풋에 여러분의 시간을 쓰세요.
            </p>
          </div>
        </section>

        {/* Section 6: Core Principles from All Videos */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">채널 영상들에서 뽑아낸 핵심 원칙</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            6개 영상을 전부 분석하여 반복적으로 강조된 원칙들을 정리했습니다.
          </p>
          <div className="space-y-4">
            <PrincipleCard title="WHY가 먼저다">
              방법론보다 중요한 건 "왜 영어를 하고 싶은가"입니다.
              장기적 목표만으로는 행동이 따라오지 않습니다 — 단기간 내에 자극이 될 구체적인 경험을 만드세요.
              컨퍼런스에서 네트워킹하는 나, 인터뷰에서 자유롭게 답변하는 나를 상상해 보세요.
            </PrincipleCard>
            <PrincipleCard title="모든 걸 다 알려고 하지 마세요">
              모르는 단어에 집착하면 전체를 놓칩니다.
              중심 내용을 파악하는 연습이 가장 중요합니다.
              해외에서 살아도 모르는 표현은 항상 나오지만, 중심을 잡으면 맥락으로 이해할 수 있습니다.
            </PrincipleCard>
            <PrincipleCard title="인풋과 아웃풋을 동시에">
              빨리 배우려면 빨리 실패해야 합니다. 허접한 외국어를 최대한 많이 내뱉으세요.
              뭘 못하는지 알아야 뭘 배워야 하는지 알게 됩니다.
              준비만 하다가 말을 안 하면 영원히 말하기는 늘지 않습니다.
            </PrincipleCard>
            <PrincipleCard title="남이 주는 문장 말고, 내 문장을 만드세요">
              회화책에 나오는 표현 대신, 내가 실제로 쓰는 표현을 영어로 만들어 보세요.
              내 일상에서 나오는 것들로 학습해야 자연스러운 복습과 노출이 되고,
              외우려 하지 않아도 외워지는 마법이 일어납니다.
            </PrincipleCard>
            <PrincipleCard title="아웃풋은 반드시 챙기세요">
              인풋만으로는 자신이 늘고 있는지 알 수 없습니다.
              15초 생각하고 45초 말하는 1분 즉흥 스피킹을 매일 해보세요 —
              혼자 말하기가 가장 어렵지만, 몇 주만 해봐도 바로 효과가 보입니다.
            </PrincipleCard>
            <PrincipleCard title="계단식 성장을 믿으세요">
              "못 해먹겠다" 싶은 순간, 머지않아 느는 걸 느끼게 됩니다.
              한 달만 해보세요. 일주일에 한 시간이라도 제대로 된 방법으로 하면 무조건 늡니다.
              영어 공부: 10년, 중국어: 4년, 불어: 6개월 — 시행착오를 줄이면 속도가 빨라집니다.
            </PrincipleCard>
          </div>
        </section>

        {/* Section 7: Sources & Credits */}
        <section className="border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">출처 & 감사</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            이 프로젝트의 학습법은 아래 영상들의 내용을 기반으로 합니다.
            모든 크레딧은 <strong>미국회사직장인</strong> 님께 있습니다.
          </p>

          <div className="space-y-3">
            {[
              {
                id: '0TI4O81gwhQ',
                title: 'TED로 집요하게 영어실력 높인 방법 (10단계 루틴)',
                duration: '45분',
                tag: '원본',
              },
              {
                id: 'I4S_sREzf4k',
                title: 'TED 영어공부법 Q&A (노잼보장. 꼭 필요한 분만 들어주세요...)',
                duration: '23분',
                tag: 'Q&A',
              },
              {
                id: 'y9Xkxp6CVyc',
                title: '국내파 영어 1년만에 통역하게되기까지 한 것',
                duration: '11분',
                tag: '경험담',
              },
              {
                id: '4SkRMwsTQeE',
                title: '영어 공부할 때 가장 먼저 해야하는 것',
                duration: '11분',
                tag: '동기부여',
              },
              {
                id: '7qiTpEON9bo',
                title: '제로베이스에서 6개월 안에 원어민과 대화하기',
                duration: '14분',
                tag: '말하기',
              },
              {
                id: '5BOJaFrUlX8',
                title: '1달만에 효과 본 영어말하기 혼자 연습법',
                duration: '8분',
                tag: '말하기',
              },
            ].map((video) => (
              <a
                key={video.id}
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors no-underline group"
              >
                <span className="shrink-0 text-red-500 text-sm">▶</span>
                <span className="text-gray-800 text-sm group-hover:text-indigo-700 transition-colors flex-1 min-w-0 truncate">
                  {video.title}
                </span>
                <span className="shrink-0 text-xs text-gray-400">{video.duration}</span>
                <span className="shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                  {video.tag}
                </span>
              </a>
            ))}
          </div>

          <p className="text-gray-500 text-sm mt-8 text-center">
            이 학습법은 TED 강연을 기반으로 하지만,
            Tudy에서는 TED뿐만 아니라 모든 YouTube 영상에 동일한 10단계를 적용할 수 있습니다.
          </p>
        </section>

        <section className="border-t border-gray-200 pt-6 text-center">
          <Link
            to="/updates"
            className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            업데이트 기록 보기 →
          </Link>
        </section>
      </div>
    </article>
  );
}

/* ---- Sub-components ---- */

function StepCard({
  step,
  title,
  color,
  children,
}: {
  step: number;
  title: string;
  color: 'indigo' | 'amber' | 'emerald';
  children: React.ReactNode;
}) {
  const colors = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  };
  const numColors = {
    indigo: 'bg-indigo-600',
    amber: 'bg-amber-600',
    emerald: 'bg-emerald-600',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ${numColors[color]}`}>
          {step}
        </span>
        <span className="font-semibold">{title}</span>
      </div>
      <div className="text-sm leading-relaxed opacity-90">{children}</div>
    </div>
  );
}

function Badge({ color, children }: { color: 'blue' | 'green' | 'purple'; children: React.ReactNode }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    purple: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

function PrincipleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}
