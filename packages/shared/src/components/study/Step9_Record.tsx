import { useState, useEffect } from 'react';
import { useRecording } from '../../hooks/useRecording';
import { formatTime } from '../../lib/dataLoader';
import { getSegmentText, getSegmentReading } from '../../lib/languageHelpers';
import type { Segment } from '../../types';

interface Props {
  sessionId: string;
  videoId: string;
  segments: Segment[];
  onComplete: () => void;
}

export default function Step9_Record({ sessionId, videoId, segments, onComplete }: Props) {
  const [segIdx, setSegIdx] = useState(0);
  const { isRecording, recordings, audioURL, startRecording, stopRecording, playRecording, loadRecordings } =
    useRecording(sessionId, videoId);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const seg = segments[segIdx];
  const segRecordings = recordings.filter((r) => r.segment_index === segIdx);

  return (
    <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 9: 녹음 비교</h3>
          <p className="text-xs text-gray-500">좋아하는 1~3분 구간만 골라서 녹음하세요.</p>
        </div>
        <button
          onClick={onComplete}
          className="shrink-0 ml-4 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          다음 →
        </button>
      </div>

      {/* Segment navigator */}
      <div className="flex items-center gap-2">
        <button
          disabled={segIdx === 0}
          onClick={() => setSegIdx((i) => i - 1)}
          className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-30"
        >
          ←
        </button>
        <span className="text-xs text-gray-600">{segIdx + 1} / {segments.length}</span>
        <button
          disabled={segIdx === segments.length - 1}
          onClick={() => setSegIdx((i) => i + 1)}
          className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-30"
        >
          →
        </button>
      </div>

      {/* Current segment */}
      {seg && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-[10px] text-gray-400 mb-0.5">{formatTime(seg.start)} - {formatTime(seg.end)}</p>
          <p className="text-sm text-gray-900">{getSegmentText(seg)}</p>
          {getSegmentReading(seg) && (
            <p className="text-xs text-gray-400 mt-0.5">{getSegmentReading(seg)}</p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">{seg.textKo}</p>
        </div>
      )}

      {/* Recording controls */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2.5">
        <div className="flex gap-2">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
            >
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              녹음 중지
            </button>
          ) : (
            <button
              onClick={() => startRecording(segIdx)}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
            >
              녹음 시작
            </button>
          )}
        </div>

        {audioURL && (
          <div>
            <p className="text-xs text-gray-500 mb-1">최근 녹음</p>
            <audio src={audioURL} controls className="w-full h-8" />
          </div>
        )}
      </div>

      {/* Previous recordings */}
      {segRecordings.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-gray-700">이전 녹음 ({segRecordings.length}개)</h4>
          {segRecordings.map((rec) => (
            <button
              key={rec.id}
              onClick={() => playRecording(rec)}
              className="w-full text-left p-2 bg-white border border-gray-200 rounded-lg text-xs hover:bg-gray-50 flex justify-between"
            >
              <span>{new Date(rec.created_at).toLocaleTimeString('ko-KR')}</span>
              <span className="text-gray-400">{rec.duration.toFixed(1)}초</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
