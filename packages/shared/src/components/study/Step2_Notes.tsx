import { useState, useCallback } from 'react';
import type { CornellNotes, SpeechStructure } from '../../types';

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

function parseNoteText(notes: string | CornellNotes): string {
  if (typeof notes === 'string') return notes;
  const parts = [];
  if (notes.cues) parts.push(notes.cues);
  if (notes.notes) parts.push(notes.notes);
  if (notes.summary) parts.push(notes.summary);
  return parts.join('\n\n') || '';
}

export default function Step2_Notes({ notes, structure, onNotesChange, onComplete }: Props) {
  const [text, setText] = useState(parseNoteText(notes));
  const [showGuide, setShowGuide] = useState(false);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
    onNotesChange({ cues: '', notes: value, summary: '' });
  }, [onNotesChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 2: 노트테이킹</h3>
          <p className="text-sm text-gray-500">다시 들으면서 중심 내용을 메모하세요.</p>
        </div>
        <div className="flex gap-2 shrink-0 ml-4">
          <button
            onClick={() => setShowGuide(true)}
            className="px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            가이드
          </button>
          <button
            onClick={onComplete}
            className="px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            다음 →
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="들리는 내용을 자유롭게 적으세요..."
        className="w-full min-h-[200px] flex-1 p-3 border border-gray-300 rounded-lg text-sm resize-y focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />

      <p className="text-xs text-gray-400">자동 저장됩니다</p>

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
                  딕테이션이 아닙니다! 전부 따라쓰기 X
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
