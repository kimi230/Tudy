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

export default function Step10_Summary({
  segments,
  structure,
  summary,
  selfScore,
  totalStudyTimeSec,
  onSummaryChange,
  onComplete,
}: Props) {
  const [localSummary, setLocalSummary] = useState(summary);

  const handleChange = (val: string) => {
    setLocalSummary(val);
    onSummaryChange(val);
  };

  const mins = Math.floor(totalStudyTimeSec / 60);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 10: 요약 & 토론</h3>
        <p className="text-sm text-gray-500">
          배운 내용을 <span className="font-medium text-gray-700">자기 말로 요약</span>하세요. 영상에서 배운 표현을 자연스럽게 사용해보세요.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summary writing */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">내용 요약 (영어로 작성해보세요)</label>
            <textarea
              value={localSummary}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Summarize the main points of this video in your own words..."
              className="w-full h-48 p-4 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Key points from structure */}
          {structure && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">핵심 포인트</h4>
              {structure.sections
                .filter((s) => s.keyPoints)
                .flatMap((s) => s.keyPoints!)
                .map((kp, i) => (
                  <span
                    key={i}
                    className="inline-block bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded mr-2 mb-1"
                  >
                    {kp}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Discussion prompts + stats */}
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-1">스피킹 프롬프트</h4>
            <p className="text-xs text-blue-600 mb-3">배운 표현을 써서 답해보세요. Active recall이 Passive learning보다 2배 효과!</p>
            <ul className="space-y-3">
              {discussionPrompts.map((q, i) => (
                <li key={i}>
                  <p className="text-sm text-blue-800 font-medium">{i + 1}. {q.en}</p>
                  <p className="text-xs text-blue-600">{q.ko}</p>
                </li>
              ))}
            </ul>
          </div>

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

      <button
        onClick={onComplete}
        className="px-5 py-2.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
      >
        학습 완료!
      </button>
    </div>
  );
}
