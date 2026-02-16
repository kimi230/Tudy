import { useState } from 'react';
import TranscriptPanel from '../transcript/TranscriptPanel';
import type { Segment, SpeechStructure, CornellNotes, NoteSection } from '../../types';

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
  'bg-cyan-100 border-cyan-300 text-cyan-800',
  'bg-orange-100 border-orange-300 text-orange-800',
];

const NOTE_SECTION_STYLES: Record<string, { bg: string; border: string; labelColor: string; label: string }> = {
  intro: { bg: 'bg-blue-50', border: 'border-blue-200', labelColor: 'text-blue-700', label: 'Intro' },
  body: { bg: 'bg-green-50', border: 'border-green-200', labelColor: 'text-green-700', label: 'Body' },
  conclusion: { bg: 'bg-purple-50', border: 'border-purple-200', labelColor: 'text-purple-700', label: 'Conclusion' },
};

function freeTextToDisplay(notes: string | CornellNotes): string {
  if (typeof notes === 'string') return notes;
  const parts = [];
  if (notes.cues) parts.push(notes.cues);
  if (notes.notes) parts.push(notes.notes);
  if (notes.summary) parts.push(notes.summary);
  return parts.join('\n\n') || '';
}

function getNoteSections(notes: string | CornellNotes): NoteSection[] {
  if (typeof notes === 'string') return [];
  return (notes.sections || []).filter(s => s.content);
}

function getNoteSectionLabel(sec: NoteSection, allSections: NoteSection[]): string {
  const style = NOTE_SECTION_STYLES[sec.type];
  if (sec.type === 'body') {
    const bodies = allSections.filter(s => s.type === 'body');
    const idx = bodies.findIndex(s => s.id === sec.id);
    return `${style.label} ${idx + 1}`;
  }
  return style.label;
}

function getSectionTitle(sec: { section?: string; title?: string; type?: string }): string {
  return sec.section || sec.title || sec.type || 'Section';
}

function getSectionSummaryKo(sec: { summaryKo?: string; titleKo?: string }): string | undefined {
  return sec.summaryKo || sec.titleKo;
}

export default function Step4_Compare({ segments, notes, structure, onComplete }: Props) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [showKorean, setShowKorean] = useState(true);
  const [popupSegment, setPopupSegment] = useState<number | null>(null);

  const popupSeg = popupSegment !== null ? segments.find(s => s.index === popupSegment) : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 4: 자막 비교</h3>
        <p className="text-sm text-gray-500">내 노트와 스피치 구조를 비교하세요. 시그널 표현을 클릭하면 해당 세그먼트를 확인할 수 있습니다.</p>
      </div>

      {/* 2-column: Notes vs Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: My notes */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">내 노트</h4>
          {(() => {
            const freeText = freeTextToDisplay(notes);
            const secs = getNoteSections(notes);
            if (!freeText && secs.length === 0) {
              return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 min-h-[300px] flex items-center justify-center">
                  <p className="text-sm text-gray-400">(노트 없음)</p>
                </div>
              );
            }
            return (
              <div className="space-y-2">
                {freeText && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-yellow-700 mb-1">자유 메모</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{freeText}</p>
                  </div>
                )}
                {secs.map(sec => {
                  const style = NOTE_SECTION_STYLES[sec.type];
                  const label = getNoteSectionLabel(sec, secs);
                  return (
                    <div key={sec.id} className={`${style.bg} border ${style.border} rounded-lg p-3`}>
                      <p className={`text-xs font-semibold ${style.labelColor} mb-1`}>{label}</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{sec.content}</p>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Right: Speech structure */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">스피치 구조</h4>
          {structure ? (
            <div className="space-y-2 min-h-[300px]">
              {/* Proportional bar */}
              <div className="flex gap-1 h-3 rounded overflow-hidden">
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

              {/* Section cards */}
              <div className="space-y-2">
                {structure.sections.map((sec, i) => {
                  const colorClass = SECTION_COLORS[i % SECTION_COLORS.length];
                  const koSummary = getSectionSummaryKo(sec);
                  return (
                    <div
                      key={i}
                      className={`border rounded-lg p-3 ${colorClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{getSectionTitle(sec)}</p>
                        <span className="text-xs opacity-70">seg {sec.startSegment}–{sec.endSegment}</span>
                      </div>
                      <p className="text-xs mt-1">{koSummary || sec.summary}</p>
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
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[300px] flex items-center justify-center">
              <p className="text-sm text-gray-400">(구조 데이터 없음)</p>
            </div>
          )}
        </div>
      </div>

      {/* Signal Expressions */}
      {structure?.signalExpressions && structure.signalExpressions.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-indigo-800 mb-3">시그널 표현 (Signal Expressions)</h4>
          <p className="text-xs text-indigo-600 mb-3">화자가 구조를 안내하는 표현들입니다. <span className="font-medium">[seg N]</span>을 클릭하면 해당 세그먼트를 볼 수 있습니다.</p>
          <div className="space-y-2">
            {structure.signalExpressions.map((sig, i) => {
              const typeColors: Record<string, string> = {
                hook: 'bg-red-100 text-red-700',
                transition: 'bg-blue-100 text-blue-700',
                emphasis: 'bg-amber-100 text-amber-700',
                enumeration: 'bg-green-100 text-green-700',
                summary: 'bg-purple-100 text-purple-700',
                conclusion: 'bg-gray-100 text-gray-700',
              };
              return (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${typeColors[sig.type] || typeColors.transition}`}>
                    {sig.type}
                  </span>
                  <div>
                    <span className="font-medium text-gray-900">"{sig.expression}"</span>
                    <span className="text-gray-500 ml-2">— {sig.role}</span>
                    <button
                      onClick={() => setPopupSegment(sig.segmentIndex)}
                      className="ml-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer font-medium"
                    >
                      [seg {sig.segmentIndex}]
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transcript (collapsible, raw data) */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>실제 트랜스크립트 (Raw Data)</span>
          <span className="text-gray-400">{showTranscript ? '▲ 접기' : '▼ 펼치기'}</span>
        </button>
        {showTranscript && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex justify-end mb-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showKorean}
                  onChange={(e) => setShowKorean(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                한국어 표시
              </label>
            </div>
            <TranscriptPanel
              segments={segments}
              currentTime={0}
              showKorean={showKorean}
              onSegmentClick={() => {}}
            />
          </div>
        )}
      </div>

      <button
        onClick={onComplete}
        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        비교 완료 → 다음 단계
      </button>

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
