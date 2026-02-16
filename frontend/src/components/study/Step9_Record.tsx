import { useState, useEffect } from 'react';
import { useRecording } from '../../hooks/useRecording';
import type { Segment } from '../../types';
import { formatTime } from '../../lib/youtube';

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
  const segRecordings = recordings.filter((r) => r.segmentIndex === segIdx);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 9: 녹음 비교</h3>
        <p className="text-sm text-gray-500">
          전체가 아니라 <span className="font-medium text-gray-700">좋아하는 1~3분 구간만</span> 골라서 녹음하세요. 원본과 비교하며 인토네이션 차이를 체크하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Segment selector */}
          <div className="flex items-center gap-3">
            <button
              disabled={segIdx === 0}
              onClick={() => setSegIdx((i) => i - 1)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-30"
            >
              ← 이전
            </button>
            <span className="text-sm text-gray-600">{segIdx + 1} / {segments.length}</span>
            <button
              disabled={segIdx === segments.length - 1}
              onClick={() => setSegIdx((i) => i + 1)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-30"
            >
              다음 →
            </button>
          </div>

          {seg && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">{formatTime(seg.start)} - {formatTime(seg.end)}</p>
              <p className="text-base text-gray-900">{seg.textEn}</p>
              <p className="text-sm text-gray-500 mt-1">{seg.textKo}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Recording controls */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-700">녹음</h4>
            <div className="flex gap-3">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
                >
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  녹음 중지
                </button>
              ) : (
                <button
                  onClick={() => startRecording(segIdx)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                >
                  녹음 시작
                </button>
              )}
            </div>

            {audioURL && (
              <div>
                <p className="text-xs text-gray-500 mb-1">최근 녹음</p>
                <audio src={audioURL} controls className="w-full" />
              </div>
            )}
          </div>

          {/* Previous recordings */}
          {segRecordings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">이전 녹음 ({segRecordings.length}개)</h4>
              {segRecordings.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => playRecording(rec)}
                  className="w-full text-left p-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex justify-between"
                >
                  <span>{new Date(rec.createdAt).toLocaleTimeString('ko-KR')}</span>
                  <span className="text-gray-400">{rec.duration.toFixed(1)}초</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onComplete}
        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        녹음 연습 완료 → 다음 단계
      </button>
    </div>
  );
}
