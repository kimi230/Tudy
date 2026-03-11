import { useState } from 'react';
import type { Segment, SpeechStructure } from '../../types';

interface Props {
  segments: Segment[];
  structure?: SpeechStructure;
  summary: string;
  selfScore: number;
  totalStudyTimeSec: number;
  onSummaryChange: (summary: string) => void;
  onComplete: () => void;
}

const discussionPrompts = [
  { en: 'Summarize the main message of this talk in your own words.', ko: '이 영상의 핵심 메시지를 자기 말로 요약하세요' },
  { en: 'What were the speaker\'s key arguments or points?', ko: '화자의 핵심 주장/포인트는 무엇이었나요?' },
  { en: 'Do you agree with the speaker? Explain using expressions from the talk.', ko: '화자에 동의하나요? 영상에서 배운 표현을 사용해 설명하세요' },
  { en: 'What was the most surprising or interesting idea? Why?', ko: '가장 놀랍거나 흥미로운 아이디어는? 이유는?' },
  { en: 'How would you explain this topic to a friend?', ko: '이 주제를 친구에게 어떻게 설명하겠어요?' },
];

/** Right-side panel: summary writing + stats */
export function Step10_SidePanel({
  summary,
  onSummaryChange,
  onComplete,
  selfScore,
  totalStudyTimeSec,
  segmentCount,
}: Pick<Props, 'summary' | 'onSummaryChange' | 'onComplete' | 'selfScore' | 'totalStudyTimeSec'> & { segmentCount: number }) {
  const [localSummary, setLocalSummary] = useState(summary);
  const mins = Math.floor(totalStudyTimeSec / 60);

  const handleChange = (val: string) => {
    setLocalSummary(val);
    onSummaryChange(val);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 10: 요약 & 토론</h3>
          <p className="text-xs text-gray-500">배운 표현을 사용해 자기 말로 요약하세요.</p>
        </div>
        <button
          onClick={onComplete}
          className="shrink-0 ml-4 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
        >
          완료!
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">내용 요약 (영어로 작성)</label>
        <textarea
          value={localSummary}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Summarize the main points of this video in your own words..."
          className="w-full h-40 p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Inline stats */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{mins}분 학습</span>
        <span className="text-gray-300">|</span>
        <span>이해도 {selfScore}%</span>
        <span className="text-gray-300">|</span>
        <span>{segmentCount}개 세그먼트</span>
      </div>
    </div>
  );
}

/** Bottom section: key points + discussion prompts */
export function Step10_Bottom({
  structure,
}: Pick<Props, 'structure'>) {
  const keyPoints = structure?.sections
    .filter((s) => s.keyPoints)
    .flatMap((s) => s.keyPoints!) ?? [];

  return (
    <div className="space-y-4">
      {/* Key points */}
      {keyPoints.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-indigo-800 mb-2">핵심 포인트</h4>
          <ul className="space-y-1.5">
            {keyPoints.map((kp, i) => (
              <li key={i} className="flex gap-2 text-sm text-indigo-700">
                <span className="shrink-0 text-indigo-400">•</span>
                <span>{kp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Discussion prompts */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-1">스피킹 프롬프트</h4>
        <p className="text-xs text-blue-600 mb-3">배운 표현을 써서 답해보세요.</p>
        <ul className="space-y-2.5">
          {discussionPrompts.map((q, i) => (
            <li key={i}>
              <p className="text-sm text-blue-800 font-medium">{i + 1}. {q.en}</p>
              <p className="text-xs text-blue-600">{q.ko}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Default export kept for backwards compatibility — not used in new layout */
export default function Step10_Summary(props: Props) {
  return (
    <>
      <Step10_SidePanel
        summary={props.summary}
        onSummaryChange={props.onSummaryChange}
        onComplete={props.onComplete}
        selfScore={props.selfScore}
        totalStudyTimeSec={props.totalStudyTimeSec}
        segmentCount={props.segments.length}
      />
      <Step10_Bottom structure={props.structure} />
    </>
  );
}
