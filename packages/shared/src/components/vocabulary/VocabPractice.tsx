import { useState, useContext, useCallback } from 'react';
import type { VocabularyItem } from '../../types';
import type { QuizResult } from '../../lib/vocabQuizEngine';
import { calcVocabQuizXP } from '../../hooks/useRewards';
import { useRewards } from '../../hooks/useRewards';
import { XPToastContext } from '../../contexts/XPToastContext';
import { getThemeColors } from '../../lib/languageHelpers';
import VocabQuiz from '../daily/VocabQuiz';

interface Props {
  vocabulary: VocabularyItem[];
  videoTitle: string;
  onClose: () => void;
}

export default function VocabPractice({ vocabulary, videoTitle, onClose }: Props) {
  const theme = getThemeColors();
  const { awardXP } = useRewards();
  const xpToast = useContext(XPToastContext);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [key, setKey] = useState(0);

  const handleComplete = useCallback(async (quizResult: QuizResult) => {
    setResult(quizResult);
    const xp = calcVocabQuizXP(quizResult.score);
    const awarded = await awardXP('vocab_practice_complete', xp);
    if (awarded && xpToast) {
      xpToast.showXPToast(awarded, '단어 연습 완료');
    }
  }, [awardXP, xpToast]);

  const handleRetry = useCallback(() => {
    setResult(null);
    setKey((k) => k + 1);
  }, []);

  if (result) {
    return (
      <div className="text-center space-y-4 py-8">
        <p className="text-sm text-gray-500 mb-2">{videoTitle}</p>
        <p className="text-4xl font-bold">{result.correctCount}/{result.totalQuestions}</p>
        <p className="text-sm text-gray-500">단어 연습 결과</p>
        <div className="w-48 mx-auto h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${result.score >= 80 ? 'bg-green-500' : result.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${result.score}%` }}
          />
        </div>
        <p className={`text-lg font-semibold ${result.score >= 80 ? 'text-green-600' : result.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
          {result.score >= 80 ? '훌륭해요!' : result.score >= 50 ? '좋아요!' : '다음에 더 잘할 수 있어요!'}
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={handleRetry}
            className={`px-6 py-2.5 ${theme.bg600} ${theme.hoverBg700} text-white rounded-lg text-sm font-semibold transition-colors`}
          >
            다시 연습하기
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">단어 연습</h2>
          <p className="text-sm text-gray-500">{videoTitle}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="닫기"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <VocabQuiz
        key={key}
        vocabulary={vocabulary}
        sessionSegmentRange={[0, Infinity]}
        quizSize={20}
        onComplete={handleComplete}
      />
    </div>
  );
}
