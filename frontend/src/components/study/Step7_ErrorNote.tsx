import { useState } from 'react';
import type { Segment, MarkedSegment, ErrorNote } from '../../types';

interface Props {
  sessionId: string;
  videoId: string;
  segments: Segment[];
  markedSegments: MarkedSegment[];
  reviewNeeded: number[];
  errorNotes: ErrorNote[];
  onAddNote: (note: Omit<ErrorNote, 'id' | 'createdAt'>) => void;
  onComplete: () => void;
}

export default function Step7_ErrorNote({
  sessionId,
  videoId,
  segments,
  markedSegments,
  reviewNeeded,
  errorNotes,
  onAddNote,
  onComplete,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [userHeard, setUserHeard] = useState('');
  const [errorType, setErrorType] = useState<ErrorNote['errorType']>('vocabulary');
  const [explanation, setExplanation] = useState('');

  // Collect all problem segments
  const problemIndices = Array.from(
    new Set([
      ...markedSegments.filter((m) => m.color === 'red').map((m) => m.segmentIndex),
      ...reviewNeeded,
    ])
  ).sort((a, b) => a - b);

  const handleAdd = () => {
    if (selectedIdx === null) return;
    const seg = segments[selectedIdx];
    onAddNote({
      sessionId,
      videoId,
      segmentIndex: selectedIdx,
      errorType,
      originalText: seg.textEn,
      userHeard,
      explanation,
      isResolved: false,
    });
    setUserHeard('');
    setExplanation('');
    setSelectedIdx(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 7: 오답노트</h3>
        <p className="text-sm text-gray-500">
          안 들렸거나 복습이 필요한 부분을 정리합니다. ({problemIndices.length}개 세그먼트)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problem segments list */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {problemIndices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">문제 세그먼트가 없습니다</p>
          ) : (
            problemIndices.map((idx) => {
              const seg = segments[idx];
              const hasNote = errorNotes.some((n) => n.segmentIndex === idx);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedIdx(idx)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedIdx === idx
                      ? 'border-indigo-300 bg-indigo-50'
                      : hasNote
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50 hover:bg-red-100'
                  }`}
                >
                  <p className="text-sm text-gray-900">{seg?.textEn}</p>
                  <p className="text-xs text-gray-500 mt-1">{seg?.textKo}</p>
                  {hasNote && <span className="text-xs text-green-600 mt-1 inline-block">✓ 노트 작성됨</span>}
                </button>
              );
            })
          )}
        </div>

        {/* Note form */}
        {selectedIdx !== null && segments[selectedIdx] && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900">{segments[selectedIdx].textEn}</p>
              <p className="text-xs text-gray-500 mt-1">{segments[selectedIdx].textKo}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">오류 유형</label>
              <select
                value={errorType}
                onChange={(e) => setErrorType(e.target.value as ErrorNote['errorType'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="vocabulary">어휘</option>
                <option value="grammar">문법</option>
                <option value="connected_speech">연음</option>
                <option value="pronunciation">발음</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">내가 들은 것</label>
              <input
                value={userHeard}
                onChange={(e) => setUserHeard(e.target.value)}
                placeholder="내가 들은 대로 적어보세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">설명/메모</label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="왜 안 들렸는지, 어떤 점을 주의해야 하는지"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none"
              />
            </div>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              오답노트 추가
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onComplete}
        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        오답노트 완료 → 다음 단계
      </button>
    </div>
  );
}
