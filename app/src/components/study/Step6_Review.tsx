import { useState } from 'react';

interface Props {
  selfScore: number;
  onScoreChange: (score: number) => void;
  onComplete: () => void;
}

export default function Step6_Review({ selfScore, onScoreChange, onComplete }: Props) {
  const [score, setScore] = useState(selfScore);

  const handleScore = (val: number) => {
    setScore(val);
    onScoreChange(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 6: 복습 듣기</h3>
          <p className="text-sm text-gray-500">자막 없이 다시 한번 전체를 들어보세요. 이전보다 얼마나 더 이해되는지 확인합니다.</p>
        </div>
        <button
          onClick={onComplete}
          className="shrink-0 ml-4 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          다음 →
        </button>
      </div>

      <div className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            자기평가: 전체 내용 중 이해한 비율은?
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={score}
            onChange={(e) => handleScore(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span>
            <span className="text-lg font-bold text-indigo-600">{score}%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          {score < 30 && '아직 어렵게 느껴지시죠? 괜찮습니다. 분석 과정을 통해 실력이 올라갑니다.'}
          {score >= 30 && score < 60 && '절반 정도 이해하셨군요! 반복 학습으로 점점 더 잘 들릴 거예요.'}
          {score >= 60 && score < 80 && '잘 하고 계십니다! 나머지 부분도 곧 익숙해질 거예요.'}
          {score >= 80 && '훌륭합니다! 대부분을 이해하고 계시네요.'}
        </div>
      </div>

    </div>
  );
}
