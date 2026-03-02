import { useState, useCallback, useMemo } from 'react';
import type { VocabularyItem } from '../../types';
import { generateQuiz, calcQuizResult } from '../../lib/vocabQuizEngine';
import type { QuizResult } from '../../lib/vocabQuizEngine';
import { getThemeColors } from '../../lib/languageHelpers';
import VocabQuizQuestion from './VocabQuizQuestion';

interface Props {
  vocabulary: VocabularyItem[];
  sessionSegmentRange: [number, number];
  onComplete: (result: QuizResult) => void;
  quizSize?: number;
}

export default function VocabQuiz({ vocabulary, sessionSegmentRange, onComplete, quizSize }: Props) {
  const theme = getThemeColors();
  const questions = useMemo(
    () => generateQuiz(vocabulary, sessionSegmentRange, quizSize),
    [vocabulary, sessionSegmentRange, quizSize],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = useCallback((idx: number) => {
    setSelectedIndex(idx);
  }, []);

  const handleNext = useCallback(() => {
    if (selectedIndex === null) return;

    const isCorrect = questions[currentIndex].options[selectedIndex].isCorrect;
    const newAnswers = [...answers, isCorrect];
    setAnswers(newAnswers);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedIndex(null);
    } else {
      setShowResult(true);
    }
  }, [selectedIndex, currentIndex, questions, answers]);

  if (questions.length === 0) {
    // Not enough vocab — skip
    onComplete({ totalQuestions: 0, correctCount: 0, score: 0 });
    return null;
  }

  if (showResult) {
    const result = calcQuizResult(answers);
    return (
      <div className="text-center space-y-4 py-6">
        <p className="text-4xl font-bold">{result.correctCount}/{result.totalQuestions}</p>
        <p className="text-sm text-gray-500">어휘 퀴즈 결과</p>
        <div className="w-48 mx-auto h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${result.score >= 80 ? 'bg-green-500' : result.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${result.score}%` }}
          />
        </div>
        <p className={`text-lg font-semibold ${result.score >= 80 ? 'text-green-600' : result.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
          {result.score >= 80 ? '훌륭해요!' : result.score >= 50 ? '좋아요!' : '다음에 더 잘할 수 있어요!'}
        </p>
        <button
          onClick={() => onComplete(result)}
          className={`px-8 py-3 ${theme.bg600} ${theme.hoverBg700} text-white rounded-lg text-sm font-semibold transition-colors`}
        >
          학습 완료하기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <VocabQuizQuestion
        key={currentIndex}
        question={questions[currentIndex]}
        questionIndex={currentIndex}
        totalQuestions={questions.length}
        selectedIndex={selectedIndex}
        onSelect={handleSelect}
        onNext={handleNext}
        theme={theme}
      />
    </div>
  );
}
