interface Props {
  currentStep: number;
  stepStatus: Record<number, 'pending' | 'in_progress' | 'completed'>;
  onStepClick: (step: number) => void;
}

const stepLabels = [
  '처음 듣기',
  '노트테이킹',
  '재듣기+마킹',
  '자막 비교',
  '문장별 분석',
  '복습 듣기',
  '오답노트',
  '쉐도잉',
  '녹음 비교',
  '요약/토론',
];

const sectionLabels = ['듣기', '분석', '아웃풋'];
const sectionSteps = [[1, 2, 3], [4, 5, 6], [7, 8, 9, 10]];

export default function StepIndicator({ currentStep, stepStatus, onStepClick }: Props) {
  return (
    <div className="flex items-center gap-0.5">
      {sectionLabels.map((section, si) => (
        <div key={section} className="flex items-center">
          {si > 0 && <div className="w-px h-5 bg-gray-200 mx-1.5 shrink-0" />}
          <span className="text-[10px] font-semibold text-gray-400 uppercase mr-1 shrink-0">{section}</span>
          {sectionSteps[si].map((step) => {
            const status = stepStatus[step] || 'pending';
            const isCurrent = step === currentStep;
            let bg = 'bg-gray-100 text-gray-400';
            if (status === 'completed') bg = 'bg-green-100 text-green-700';
            else if (isCurrent) bg = 'bg-indigo-600 text-white';
            else if (status === 'in_progress') bg = 'bg-indigo-100 text-indigo-700';

            return (
              <button
                key={step}
                onClick={() => onStepClick(step)}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors shrink-0 ${bg}`}
                title={stepLabels[step - 1]}
              >
                {step}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
