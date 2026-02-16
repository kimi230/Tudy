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

/** Right-side panel: summary writing only */
export function Step10_SidePanel({
  summary,
  onSummaryChange,
  onComplete,
}: Pick<Props, 'summary' | 'onSummaryChange' | 'onComplete'>) {
  const [localSummary, setLocalSummary] = useState(summary);

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
    </div>
  );
}

/** Bottom section: key points + discussion prompts + stats */
export function Step10_Bottom({
  segments,
  structure,
  selfScore,
  totalStudyTimeSec,
}: Pick<Props, 'segments' | 'structure' | 'selfScore' | 'totalStudyTimeSec'>) {
  const mins = Math.floor(totalStudyTimeSec / 60);

  const keyPoints = structure?.sections
    .filter((s) => s.keyPoints)
    .flatMap((s) => s.keyPoints!) ?? [];

  return (
    <div className="space-y-4">
      {/* Key points */}
      {keyPoints.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-indigo-800 mb-2">핵심 포인트</h4>
          <div className="flex flex-wrap gap-1.5">
            {keyPoints.map((kp, i) => (
              <span
                key={i}
                className="inline-block bg-white text-indigo-700 text-xs px-2.5 py-1 rounded border border-indigo-200"
              >
                {kp}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Discussion prompts */}
        <div className="lg:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
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

        {/* Stats */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-800 mb-3">학습 통계</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-green-700">총 학습 시간</span>
              <span className="font-medium">{mins}분</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">이해도</span>
              <span className="font-medium">{selfScore}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">총 세그먼트</span>
              <span className="font-medium">{segments.length}개</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Default export kept for backwards compatibility — not used in new layout */
export default function Step10_Summary(props: Props) {
  return (
    <>
      <Step10_SidePanel
        structure={props.structure}
        summary={props.summary}
        onSummaryChange={props.onSummaryChange}
        onComplete={props.onComplete}
      />
      <Step10_Bottom
        segments={props.segments}
        selfScore={props.selfScore}
        totalStudyTimeSec={props.totalStudyTimeSec}
      />
    </>
  );
}
