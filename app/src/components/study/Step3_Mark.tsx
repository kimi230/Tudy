import { useCallback } from 'react';
import TranscriptPanel from '../transcript/TranscriptPanel';
import type { Segment, MarkedSegment, CornellNotes } from '../../types';

interface Props {
  currentTime: number;
  segments: Segment[];
  notes: string | CornellNotes;
  markedSegments: MarkedSegment[];
  onMarkedChange: (marks: MarkedSegment[]) => void;
  onComplete: () => void;
}

function notesToString(notes: string | CornellNotes): string {
  if (typeof notes === 'string') return notes;
  const parts = [];
  if (notes.cues) parts.push(`[큐] ${notes.cues}`);
  if (notes.notes) parts.push(`[노트] ${notes.notes}`);
  if (notes.summary) parts.push(`[요약] ${notes.summary}`);
  return parts.join('\n\n') || '';
}

export default function Step3_Mark({
  currentTime,
  segments,
  notes,
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TranscriptPanel
            segments={segments}
            currentTime={currentTime}
            showKorean={false}
            markedSegments={markedSegments}
            onSegmentClick={() => {}}
            onMark={handleMark}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">마킹 현황</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600">이해됨/새로 캐치</span>
                <span>{blueCount}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600">여전히 안 들림</span>
                <span>{redCount}개</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">내 노트</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{notesToString(notes) || '(노트 없음)'}</p>
          </div>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        마킹 완료 → 다음 단계
      </button>
    </div>
  );
}
