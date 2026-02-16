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
    <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 8: 쉐도잉</h3>
          <p className="text-xs text-gray-500">3단계로 진행하세요.</p>
        </div>
        <button
          onClick={() => {
            if (phase < 3) {
              setPhase((phase + 1) as ShadowPhase);
            } else {
              onComplete();
            }
          }}
          className="shrink-0 ml-4 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          {phase < 3 ? `Phase ${phase + 1} →` : '다음 →'}
        </button>
      </div>

      {/* Phase selector */}
      <div className="flex gap-1.5">
        {([1, 2, 3] as ShadowPhase[]).map((p) => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className={`flex-1 py-1.5 px-1.5 rounded-lg text-xs font-medium transition-colors border ${
              phase === p
                ? 'bg-indigo-600 text-white border-indigo-600'
                : phase > p
                ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {PHASE_CONFIG[p].title}
          </button>
        ))}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
        <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
          {config.tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
        <p className="text-[10px] text-blue-600 mt-1.5">
          추천 속도: <span className="font-bold">{config.recommendedRate}x</span>
        </p>
      </div>

      {/* Transcript area */}
      {config.showScript ? (
        <TranscriptPanel
          segments={segments}
          currentTime={currentTime}
          showKorean={phase === 1}
          highlightWords
          compact
          onSegmentClick={() => {}}
          maxHeight="340px"
        />
      ) : (
        <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-400">
          <p className="text-sm mb-1">블라인드 모드</p>
          <p className="text-xs">소리에만 집중하세요</p>
          <p className="text-[10px] mt-2 text-gray-300">안 되는 부분은 Phase 2로 돌아가세요</p>
        </div>
      )}
    </div>
  );
}
