import { useState, useCallback } from 'react';
import type { CornellNotes, NoteSection, SpeechStructure } from '../../types';

interface Props {
  notes: string | CornellNotes;
  structure?: SpeechStructure;
  onNotesChange: (notes: CornellNotes) => void;
  onComplete: () => void;
}

const SIGNAL_EXPRESSIONS = [
  { expression: 'So here\'s what I found', meaning: '핵심 발견 전환' },
  { expression: 'The key is / The key takeaway', meaning: '핵심 메시지' },
  { expression: 'What I realized was', meaning: '깨달음/인사이트' },
  { expression: 'The important thing is', meaning: '중요 포인트 강조' },
  { expression: 'There are three things', meaning: '열거/나열 시작' },
  { expression: 'In other words', meaning: '다른 말로 바꿔 설명' },
  { expression: 'Let me give you an example', meaning: '예시 전환' },
  { expression: 'To sum up / In conclusion', meaning: '결론 시작' },
];

const SECTION_STYLES = {
  intro: { color: 'bg-blue-500', hover: 'hover:bg-blue-600', lightBg: 'bg-blue-50', border: 'border-blue-300', ring: 'focus:ring-blue-500 focus:border-blue-500', label: 'Intro', labelColor: 'text-blue-700', placeholder: '- 서론/도입부 내용...' },
  body: { color: 'bg-green-500', hover: 'hover:bg-green-600', lightBg: 'bg-green-50', border: 'border-green-300', ring: 'focus:ring-green-500 focus:border-green-500', label: 'Body', labelColor: 'text-green-700', placeholder: '- 본론/핵심 내용...' },
  conclusion: { color: 'bg-purple-500', hover: 'hover:bg-purple-600', lightBg: 'bg-purple-50', border: 'border-purple-300', ring: 'focus:ring-purple-500 focus:border-purple-500', label: 'Conclusion', labelColor: 'text-purple-700', placeholder: '- 결론/마무리...' },
} as const;

function parseNotes(notes: string | CornellNotes): { text: string; sections: NoteSection[] } {
  if (typeof notes === 'string') return { text: notes, sections: [] };
  const parts = [];
  if (notes.cues) parts.push(notes.cues);
  if (notes.notes) parts.push(notes.notes);
  if (notes.summary) parts.push(notes.summary);
  return {
    text: parts.join('\n\n') || '',
    sections: notes.sections || [],
  };
}

let nextId = Date.now();
function genId() {
  return String(nextId++);
}

function getSectionLabel(section: NoteSection, allSections: NoteSection[]): string {
  const style = SECTION_STYLES[section.type];
  if (section.type === 'body') {
    const bodies = allSections.filter(s => s.type === 'body');
    const idx = bodies.findIndex(s => s.id === section.id);
    return `${style.label} ${idx + 1}`;
  }
  return style.label;
}

export default function Step2_Notes({ notes, structure, onNotesChange, onComplete }: Props) {
  const parsed = parseNotes(notes);
  const [text, setText] = useState(parsed.text);
  const [sections, setSections] = useState<NoteSection[]>(parsed.sections);
  const [showGuide, setShowGuide] = useState(false);
  const emitChange = useCallback((t: string, secs: NoteSection[]) => {
    onNotesChange({
      cues: '', notes: t, summary: '',
      sections: secs.length > 0 ? secs : undefined,
    });
  }, [onNotesChange]);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
    emitChange(value, sections);
  }, [emitChange, sections]);

  const addSection = useCallback((type: 'intro' | 'body' | 'conclusion') => {
    const newSection: NoteSection = { id: genId(), type, content: '- ' };
    const next = [...sections, newSection];
    setSections(next);
    emitChange(text, next);
  }, [emitChange, sections, text]);

  const updateSection = useCallback((id: string, content: string) => {
    const next = sections.map(s => s.id === id ? { ...s, content } : s);
    setSections(next);
    emitChange(text, next);
  }, [emitChange, sections, text]);

  const removeSection = useCallback((id: string) => {
    const next = sections.filter(s => s.id !== id);
    setSections(next);
    emitChange(text, next);
  }, [emitChange, sections, text]);

  const makeBulletHandler = useCallback((onChange: (v: string) => void) => {
    return (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const { selectionStart, value } = textarea;
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const currentLine = value.slice(lineStart, selectionStart);
        const prefix = currentLine.match(/^(\s*- )/)?.[1];
        const insert = prefix ? `\n${prefix}` : '\n- ';
        const newValue = value.slice(0, selectionStart) + insert + value.slice(selectionStart);
        onChange(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + insert.length;
        });
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 2: 노트테이킹</h3>
          <p className="text-sm text-gray-500">다시 들으면서 중심 내용을 메모하세요. 엔터를 누르면 자동으로 불릿이 추가됩니다.</p>
        </div>
        <button
          onClick={() => setShowGuide(true)}
          className="shrink-0 ml-4 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          가이드
        </button>
      </div>

      {/* Free-form notes — compact */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">자유 메모</label>
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={makeBulletHandler(handleTextChange)}
          placeholder="- 들리는 내용을 적으세요..."
          className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg text-sm resize-y focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Section add buttons */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-2 block">구조화 노트</label>
        <div className="flex gap-2">
          {(['intro', 'body', 'conclusion'] as const).map(type => {
            const style = SECTION_STYLES[type];
            return (
              <button
                key={type}
                onClick={() => addSection(type)}
                className={`px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors ${style.color} ${style.hover}`}
              >
                + {style.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section boxes */}
      {sections.length > 0 && (
        <div className="space-y-3">
          {sections.map(sec => {
            const style = SECTION_STYLES[sec.type];
            const label = getSectionLabel(sec, sections);
            return (
              <div key={sec.id} className={`rounded-lg border ${style.border} ${style.lightBg} p-3`}>
                <div className="flex items-center justify-between mb-1">
                  <label className={`text-xs font-semibold ${style.labelColor}`}>{label}</label>
                  <button
                    onClick={() => removeSection(sec.id)}
                    className="text-gray-400 hover:text-red-500 text-sm leading-none px-1"
                    title="삭제"
                  >
                    &times;
                  </button>
                </div>
                <textarea
                  value={sec.content}
                  onChange={(e) => updateSection(sec.id, e.target.value)}
                  onKeyDown={makeBulletHandler((v) => updateSection(sec.id, v))}
                  placeholder={style.placeholder}
                  className={`w-full min-h-[100px] p-3 border ${style.border} rounded-lg text-sm resize-y focus:ring-2 ${style.ring} bg-white`}
                  autoFocus
                />
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400">자동 저장됩니다</p>

      <button
        onClick={onComplete}
        className="px-5 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
      >
        노트 완료 → 다음 단계
      </button>

      {/* Guide popup */}
      {showGuide && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              &times;
            </button>

            <h3 className="text-lg font-semibold text-gray-900 mb-4">노트테이킹 가이드</h3>

            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-800">
                  딕테이션이 아닙니다! 전부 받아쓰기 X
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  안 들리는 부분에 집착하지 마세요. 흘러가는 속도에 맞춰 중심 내용과 키워드만 잡으세요.
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-800 mb-2">스피치 구조를 파악하세요</p>
                <div className="flex gap-2 text-xs">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">서론 (인트로/후킹)</span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">본론 (주장/스토리)</span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">결론</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-800 mb-2">시그널 표현을 감지하세요</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {SIGNAL_EXPRESSIONS.map((sig, i) => (
                    <div key={i} className="text-xs flex items-center gap-1">
                      <span className="text-indigo-700 font-medium">"{sig.expression}"</span>
                      <span className="text-gray-500">— {sig.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>

              {structure?.signalExpressions && structure.signalExpressions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2">이 영상의 시그널 표현</p>
                  <div className="space-y-1">
                    {structure.signalExpressions.map((sig, i) => (
                      <div key={i} className="text-xs bg-gray-50 rounded px-2 py-1">
                        <span className="text-indigo-700 font-medium">"{sig.expression}"</span>
                        <span className="text-gray-500 ml-1">— {sig.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500">
                흘림체 OK, 한국어 OK — 나만 알아보면 됩니다. 숫자가 언급되면 ("세 가지가 있어") 바로 번호를 매기세요.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
