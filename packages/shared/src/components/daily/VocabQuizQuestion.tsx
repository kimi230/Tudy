import { useEffect } from 'react';
import type { QuizQuestion } from '../../lib/vocabQuizEngine';
import { getVocabPhonetic } from '../../lib/languageHelpers';
import type { ThemeColors } from '../../lib/languageHelpers';

interface Props {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onNext: () => void;
  theme: ThemeColors;
}

export default function VocabQuizQuestion({
  question,
  questionIndex,
  totalQuestions,
  selectedIndex,
  onSelect,
  onNext,
  theme,
}: Props) {
  const answered = selectedIndex !== null;
  const isCorrect = answered && question.options[selectedIndex].isCorrect;
  const phonetic = getVocabPhonetic(question.targetItem);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = question.targetItem as any;
  const koreanMeaning: string = raw.koreanMeaning ?? raw.meaningKo ?? question.targetItem.definition ?? '';

  // Keyboard support
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key) - 1;
        if (idx < question.options.length && !answered) {
          onSelect(idx);
        }
      }
      if ((e.key === ' ' || e.key === 'Enter') && answered) {
        e.preventDefault();
        onNext();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [answered, onSelect, onNext, question.options.length]);

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          {questionIndex + 1} / {totalQuestions}
        </span>
        <div className="flex-1 mx-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${theme.bg500} rounded-full transition-all duration-300`}
            style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question prompt */}
      <div className="text-center space-y-2 py-2">
        {question.type === 'word_to_meaning' ? (
          <>
            <p className="text-2xl font-bold text-gray-900">{question.targetItem.word}</p>
            {phonetic && (
              <p className="text-sm text-gray-400">{phonetic}</p>
            )}
            <p className="text-sm text-gray-500">이 단어의 뜻은?</p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-gray-700">{koreanMeaning}</p>
            <p className="text-sm text-gray-500">이 뜻에 해당하는 단어는?</p>
          </>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {question.options.map((opt, idx) => {
          let btnClass = 'w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm ';

          if (!answered) {
            btnClass += 'border-gray-200 hover:border-gray-300 bg-white text-gray-800 cursor-pointer';
          } else if (opt.isCorrect) {
            btnClass += 'border-green-500 bg-green-50 text-green-800 font-semibold';
          } else if (idx === selectedIndex) {
            btnClass += 'border-red-500 bg-red-50 text-red-800';
          } else {
            btnClass += 'border-gray-100 bg-gray-50 text-gray-400';
          }

          return (
            <button
              key={idx}
              className={btnClass}
              onClick={() => !answered && onSelect(idx)}
              disabled={answered}
            >
              <span className="inline-block w-6 text-xs text-gray-400 font-mono">{idx + 1}.</span>
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Feedback + context sentence */}
      {answered && (
        <div className="space-y-3">
          <div className={`text-center text-sm font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {isCorrect ? '정답!' : '오답'}
          </div>
          {question.targetItem.contextSentence && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <span className="font-medium text-gray-500 text-xs block mb-1">예문</span>
              {question.targetItem.contextSentence}
            </div>
          )}
          <button
            onClick={onNext}
            className={`w-full py-3 ${theme.bg600} ${theme.hoverBg700} text-white rounded-lg text-sm font-semibold transition-colors`}
          >
            {questionIndex + 1 < totalQuestions ? '다음' : '결과 보기'}
          </button>
        </div>
      )}
    </div>
  );
}
