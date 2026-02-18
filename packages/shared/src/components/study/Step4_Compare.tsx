import { useState } from 'react';
import { formatTime } from '../../lib/dataLoader';
import { getSegmentText, getSegmentReading } from '../../lib/languageHelpers';
import type { Segment, SpeechStructure } from '../../types';

interface Props {
  segments: Segment[];
  structure?: SpeechStructure;
}

const SECTION_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-800',
  'bg-green-100 border-green-300 text-green-800',
  'bg-purple-100 border-purple-300 text-purple-800',
  'bg-amber-100 border-amber-300 text-amber-800',
  'bg-rose-100 border-rose-300 text-rose-800',
  'bg-teal-100 border-teal-300 text-teal-800',
];

const TYPE_COLORS: Record<string, string> = {
  hook: 'bg-red-100 text-red-700',
  narrative_opening: 'bg-red-100 text-red-700',
  transition: 'bg-blue-100 text-blue-700',
  emphasis: 'bg-amber-100 text-amber-700',
  enumeration: 'bg-green-100 text-green-700',
  summary: 'bg-purple-100 text-purple-700',
  conclusion: 'bg-gray-100 text-gray-700',
  rhetorical_question: 'bg-pink-100 text-pink-700',
  reveal: 'bg-emerald-100 text-emerald-700',
  evidence: 'bg-cyan-100 text-cyan-700',
  honesty: 'bg-orange-100 text-orange-700',
  recommendation: 'bg-teal-100 text-teal-700',
  restatement: 'bg-violet-100 text-violet-700',
};

function getSectionTitle(sec: { section?: string; title?: string; titleKo?: string; type?: string }): string {
  return sec.titleKo || sec.title || sec.section || sec.type || 'Section';
}

export default function Step4_Compare({ segments, structure }: Props) {
  const [popupSegment, setPopupSegment] = useState<number | null>(null);
  const popupSeg = popupSegment !== null ? segments.find(s => s.index === popupSegment) : null;

  if (!structure) return null;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 스피치 구조 */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">스피치 구조</p>
          {/* Proportional bar */}
          <div className="flex gap-0.5 h-2.5 rounded overflow-hidden mb-3">
            {structure.sections.map((sec, i) => {
              const width = ((sec.endSegment - sec.startSegment + 1) / segments.length) * 100;
              const bgOnly = SECTION_COLORS[i % SECTION_COLORS.length].split(' ')[0];
              return (
                <div
                  key={i}
                  className={`${bgOnly} rounded-sm`}
                  style={{ width: `${Math.max(width, 3)}%` }}
                  title={getSectionTitle(sec)}
                />
              );
            })}
          </div>
          <div className="space-y-2">
            {structure.sections.map((sec, i) => {
              const colorClass = SECTION_COLORS[i % SECTION_COLORS.length];
              return (
                <div key={i} className={`border rounded-lg px-3 py-2 ${colorClass}`}>
                  <p className="text-sm font-semibold">{getSectionTitle(sec)}</p>
                  <p className="text-xs mt-0.5">{sec.summary}</p>
                  {sec.keyPoints && sec.keyPoints.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {sec.keyPoints.map((kp, j) => (
                        <span key={j} className="text-[10px] bg-white/50 rounded px-1 py-0.5">{kp}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 시그널 표현 */}
        <div>
          <p className="text-xs font-medium text-indigo-700 mb-2">시그널 표현</p>
          {structure.signalExpressions && structure.signalExpressions.length > 0 ? (
            <div className="space-y-2">
              {structure.signalExpressions.map((sig, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${TYPE_COLORS[sig.type] || 'bg-gray-100 text-gray-700'}`}>
                      {sig.type}
                    </span>
                    <button
                      onClick={() => setPopupSegment(sig.segmentIndex)}
                      className="text-[10px] text-indigo-600 hover:underline font-medium"
                    >
                      seg {sig.segmentIndex}
                    </button>
                  </div>
                  <p className="text-sm font-medium text-gray-900">"{sig.expression}"</p>
                  <p className="text-xs text-gray-500 mt-0.5">{sig.role}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">(시그널 표현 없음)</p>
          )}
        </div>
      </div>

      {/* Segment popup modal */}
      {popupSegment !== null && popupSeg && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPopupSegment(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPopupSegment(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              &times;
            </button>
            <h4 className="text-sm font-semibold text-gray-500 mb-3">Segment {popupSeg.index}</h4>
            <p className="text-xs text-gray-400 mb-2">
              {formatTime(popupSeg.start)} – {formatTime(popupSeg.end)}
            </p>
            <p className="text-base text-gray-900 leading-relaxed">{getSegmentText(popupSeg)}</p>
            {getSegmentReading(popupSeg) && (
              <p className="text-sm text-gray-400 mt-0.5">{getSegmentReading(popupSeg)}</p>
            )}
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{popupSeg.textKo}</p>
          </div>
        </div>
      )}
    </>
  );
}
