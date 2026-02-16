import { useState } from 'react';
import TranscriptPanel from '../transcript/TranscriptPanel';
import type { Segment } from '../../types';

interface Props {
  currentTime: number;
  segments: Segment[];
  onComplete: () => void;
}

type ShadowPhase = 1 | 2 | 3;

const PHASE_CONFIG: Record<ShadowPhase, {
  title: string;
  description: string;
  showScript: boolean;
  recommendedRate: number;
  tips: string[];
}> = {
  1: {
    title: 'Phase 1: 읽기',
    description: '스크립트 보며 천천히 읽기',
    showScript: true,
    recommendedRate: 0.75,
    tips: [
      '스크립트를 보면서 소리 내어 천천히 읽으세요',
      '모르는 단어의 발음을 확인하세요',
      '문장의 의미를 이해하며 읽으세요',
    ],
  },
  2: {
    title: 'Phase 2: 쉐도잉',
    description: '같은 속도로 따라하기 (스크립트 참고)',
    showScript: true,
    recommendedRate: 1.0,
    tips: [
      '원어민과 동시에 따라 말하세요',
      '인토네이션(억양)까지 따라하세요 — 연기자처럼!',
      '강세와 리듬을 복사하세요',
      '어려우면 스크립트를 참고하세요',
    ],
  },
  3: {
    title: 'Phase 3: 블라인드',
    description: '스크립트 없이 소리만 따라하기',
    showScript: false,
    recommendedRate: 1.0,
    tips: [
      '스크립트를 보지 않고 소리에만 집중하세요',
      '완벽하지 않아도 괜찮아요 — 감정과 톤을 담아 말하세요',
      '안 되는 부분은 Phase 2로 돌아가서 확인하세요',
    ],
  },
};

export default function Step8_Shadow({ currentTime, segments, onComplete }: Props) {
  const [phase, setPhase] = useState<ShadowPhase>(1);

  const config = PHASE_CONFIG[phase];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 8: 쉐도잉</h3>
        <p className="text-sm text-gray-500">분석이 끝난 후 쉐도잉해야 효과가 있습니다. 3단계로 진행하세요.</p>
      </div>

      {/* Phase selector */}
      <div className="flex gap-2">
        {([1, 2, 3] as ShadowPhase[]).map((p) => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-colors border ${
              phase === p
                ? 'bg-indigo-600 text-white border-indigo-600'
                : phase > p
                ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <p className="font-semibold whitespace-nowrap">{PHASE_CONFIG[p].title}</p>
            <p className="text-xs mt-0.5 opacity-80">{PHASE_CONFIG[p].description}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Phase-specific tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">{config.title}</h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              {config.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
            <p className="text-xs text-blue-600 mt-3">
              추천 재생 속도: <span className="font-bold">{config.recommendedRate}x</span>
            </p>
          </div>

          {/* Intonation guide (always visible) */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <span className="font-medium">연기자처럼!</span> 단순히 단어를 따라하는 게 아니라, 감정/톤/강세까지 복사하세요.
              인토네이션이 영어의 핵심입니다.
            </p>
          </div>
        </div>

        {/* Transcript area */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              트랜스크립트 {!config.showScript && '(숨김)'}
            </h4>
          </div>

          {config.showScript ? (
            <TranscriptPanel
              segments={segments}
              currentTime={currentTime}
              showKorean={phase === 1}
              highlightWords
              onSegmentClick={() => {}}
            />
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-400 min-h-[300px] flex flex-col items-center justify-center">
              <p className="text-lg mb-2">블라인드 모드</p>
              <p className="text-sm">소리에만 집중하세요</p>
              <p className="text-xs mt-4 text-gray-300">안 되는 부분이 있으면 Phase 2로 돌아가세요</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => {
          if (phase < 3) {
            setPhase((phase + 1) as ShadowPhase);
          } else {
            onComplete();
          }
        }}
        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        {phase < 3 ? `Phase ${phase + 1}로 진행 →` : '쉐도잉 완료 → 다음 단계'}
      </button>
    </div>
  );
}
