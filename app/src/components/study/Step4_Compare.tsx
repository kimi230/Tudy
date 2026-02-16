import { useState } from 'react';
import type { Segment, SpeechStructure, CornellNotes } from '../../types';

interface Props {
  segments: Segment[];
  notes: string | CornellNotes;
  structure?: SpeechStructure;
  onComplete: () => void;
}

const SECTION_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-800',
  'bg-green-100 border-green-300 text-green-800',
  'bg-purple-100 border-purple-300 text-purple-800',
  'bg-amber-100 border-amber-300 text-amber-800',
  'bg-rose-100 border-rose-300 text-rose-800',
  'bg-teal-100 border-teal-300 text-teal-800',
];

function freeTextToDisplay(notes: string | CornellNotes): string {
  if (typeof notes === 'string') return notes;
  const parts = [];
  if (notes.cues) parts.push(notes.cues);
  if (notes.notes) parts.push(notes.notes);
  if (notes.summary) parts.push(notes.summary);
  return parts.join('\n\n') || '';
}

function getSectionTitle(sec: { section?: string; title?: string; type?: string }): string {
  return sec.section || sec.title || sec.type || 'Section';
}

export default function Step4_Compare({ segments, notes, structure, onComplete }: Props) {
  const [popupSegment, setPopupSegment] = useState<number | null>(null);
  const popupSeg = popupSegment !== null ? segments.find(s => s.index === popupSegment) : null;
  const freeText = freeTextToDisplay(notes);

  const typeColors: Record<string, string> = {
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

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 4: 자막 비교</h3>
          <p className="text-sm text-gray-500">노트와 실제 구조를 비교하세요.</p>
        </div>
        <button
          onClick={onComplete}
          className="shrink-0 ml-4 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          다음 →
        </button>
      </div>

      {/* 내 노트 */}
      <div>
        <p className="text-xs font-medium text-yellow-700 mb-1">내 노트</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{freeText || '(노트 없음)'}</p>
        </div>
      </div>

      {/* 스피치 구조 */}
      {structure && (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1">스피치 구조</p>
          {/* Proportional bar */}
          <div className="flex gap-0.5 h-2 rounded overflow-hidden mb-2">
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
          <div className="space-y-1.5">
            {structure.sections.map((sec, i) => {
              const colorClass = SECTION_COLORS[i % SECTION_COLORS.length];
              return (
                <div key={i} className={`border rounded-lg px-3 py-2 ${colorClass}`}>
                  <p className="text-sm font-semibold">{getSectionTitle(sec)}</p>
                  <p className="text-xs mt-0.5">{sec.summary}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 시그널 표현 */}
      {structure?.signalExpressions && structure.signalExpressions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-indigo-700 mb-1">시그널 표현</p>
          <div className="space-y-1.5">
            {structure.signalExpressions.map((sig, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <span className={`px-1.5 py-0.5 rounded shrink-0 ${typeColors[sig.type] || 'bg-gray-100 text-gray-700'}`}>
                  {sig.type}
                </span>
                <div>
                  <span className="font-medium text-gray-900">"{sig.expression}"</span>
                  <span className="text-gray-500 ml-1">— {sig.role}</span>
                  <button
                    onClick={() => setPopupSegment(sig.segmentIndex)}
                    className="ml-1 text-indigo-600 hover:underline font-medium"
                  >
                    [seg {sig.segmentIndex}]
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <p className="text-base text-gray-900 leading-relaxed">{popupSeg.textEn}</p>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{popupSeg.textKo}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
