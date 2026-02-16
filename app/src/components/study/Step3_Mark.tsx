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
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 3: 재듣기 + 마킹</h3>
          <p className="text-sm text-gray-500">
            <span className="inline-block w-2.5 h-2.5 bg-blue-200 rounded mr-1 align-middle" /> 캐치
            <span className="inline-block w-2.5 h-2.5 bg-red-200 rounded ml-2 mr-1 align-middle" /> 안 들림
          </p>
        </div>
        <button
          onClick={onComplete}
          className="shrink-0 ml-4 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          다음 →
        </button>
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

      <div className="flex gap-4 text-xs text-gray-500">
        <span><span className="inline-block w-2 h-2 bg-blue-200 rounded mr-1" />{blueCount}개</span>
        <span><span className="inline-block w-2 h-2 bg-red-200 rounded mr-1" />{redCount}개</span>
      </div>
    </div>
  );
}
