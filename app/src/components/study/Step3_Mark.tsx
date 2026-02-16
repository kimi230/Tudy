import { useCallback } from 'react';
import TranscriptPanel from '../transcript/TranscriptPanel';
import type { Segment, MarkedSegment } from '../../types';

interface Props {
  currentTime: number;
  segments: Segment[];
  markedSegments: MarkedSegment[];
  onMarkedChange: (marks: MarkedSegment[]) => void;
  onComplete: () => void;
}

export default function Step3_Mark({
  currentTime,
  segments,
  markedSegments,
  onMarkedChange,
  onComplete,
}: Props) {
  const handleMark = useCallback(
    (segmentIndex: number, color: 'blue' | 'red') => {
      const existing = markedSegments.findIndex((m) => m.segmentIndex === segmentIndex);
      let updated: MarkedSegment[];
      if (existing >= 0 && markedSegments[existing].color === color) {
        updated = markedSegments.filter((_, i) => i !== existing);
      } else if (existing >= 0) {
        updated = markedSegments.map((m, i) => (i === existing ? { ...m, color } : m));
      } else {
        updated = [...markedSegments, { segmentIndex, color }];
      }
      onMarkedChange(updated);
    },
    [markedSegments, onMarkedChange]
  );

  const blueCount = markedSegments.filter((m) => m.color === 'blue').length;
  const redCount = markedSegments.filter((m) => m.color === 'red').length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 3: 재듣기 + 마킹</h3>
        <p className="text-sm text-gray-500">
          3번째 듣기입니다. 2번째 듣기에서 놓친 부분을 추가로 캐치하세요.
          <span className="inline-block w-3 h-3 bg-blue-200 rounded ml-2 align-middle" /> 이해됨/새로 캐치
          <span className="inline-block w-3 h-3 bg-red-200 rounded ml-2 align-middle" /> 여전히 안 들림
        </p>
      </div>

      <TranscriptPanel
        segments={segments}
        currentTime={currentTime}
        showKorean={false}
        markedSegments={markedSegments}
        onSegmentClick={() => {}}
        onMark={handleMark}
        maxHeight="340px"
      />

      <div className="flex gap-4 text-sm text-gray-500">
        <span><span className="inline-block w-2.5 h-2.5 bg-blue-200 rounded mr-1" />{blueCount}개 캐치</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-red-200 rounded mr-1" />{redCount}개 안 들림</span>
      </div>

      <button
        onClick={onComplete}
        className="px-5 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
      >
        마킹 완료 → 다음 단계
      </button>
    </div>
  );
}
