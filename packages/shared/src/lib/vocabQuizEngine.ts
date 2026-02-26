import type { VocabularyItem } from '../types';

export interface QuizQuestion {
  id: number;
  type: 'word_to_meaning' | 'meaning_to_word';
  targetItem: VocabularyItem;
  options: { label: string; isCorrect: boolean }[];
  correctIndex: number;
}

export interface QuizResult {
  totalQuestions: number;
  correctCount: number;
  score: number; // 0-100
}

/** Extract Korean meaning from a vocabulary item (handles field name variations) */
function getKoreanMeaning(item: VocabularyItem): string {
  return (
    (item as Record<string, unknown>).koreanMeaning as string ??
    (item as Record<string, unknown>).meaningKo as string ??
    item.definition ??
    ''
  );
}

/** Fisher-Yates shuffle (in-place) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate vocab quiz questions.
 * @param vocabulary    full video vocabulary list
 * @param segmentRange  [start, end) segment indices for current session
 * @param quizSize      number of questions (default 5)
 */
export function generateQuiz(
  vocabulary: VocabularyItem[],
  segmentRange: [number, number],
  quizSize = 5,
): QuizQuestion[] {
  if (vocabulary.length < 4) return [];

  // Split into session-range and rest
  const inRange = vocabulary.filter(
    (v) => v.segmentIndex >= segmentRange[0] && v.segmentIndex < segmentRange[1],
  );
  const outRange = vocabulary.filter(
    (v) => v.segmentIndex < segmentRange[0] || v.segmentIndex >= segmentRange[1],
  );

  // Prioritise essential words, then in-range, then the rest
  const prioritised = [
    ...shuffle(inRange.filter((v) => v.isEssential)),
    ...shuffle(inRange.filter((v) => !v.isEssential)),
    ...shuffle(outRange.filter((v) => v.isEssential)),
    ...shuffle(outRange.filter((v) => !v.isEssential)),
  ];

  // Deduplicate by Korean meaning (avoid multiple items with the same meaning)
  const seen = new Set<string>();
  const candidates: VocabularyItem[] = [];
  for (const item of prioritised) {
    const meaning = getKoreanMeaning(item);
    if (!meaning || seen.has(meaning)) continue;
    seen.add(meaning);
    candidates.push(item);
    if (candidates.length >= quizSize) break;
  }

  // Determine question types: ~60% word→meaning, ~40% meaning→word
  const questions: QuizQuestion[] = candidates.map((target, idx) => {
    const type: QuizQuestion['type'] =
      idx % 5 < 3 ? 'word_to_meaning' : 'meaning_to_word';

    const options = buildOptions(target, vocabulary, type);

    return {
      id: idx,
      type,
      targetItem: target,
      options,
      correctIndex: options.findIndex((o) => o.isCorrect),
    };
  });

  return questions;
}

/** Build 4 options for a question, preferring same part-of-speech distractors. */
function buildOptions(
  target: VocabularyItem,
  allVocab: VocabularyItem[],
  type: QuizQuestion['type'],
): { label: string; isCorrect: boolean }[] {
  const targetMeaning = getKoreanMeaning(target);

  // Get distractors — exclude items with same meaning
  const samePOS = allVocab.filter(
    (v) =>
      v.word !== target.word &&
      getKoreanMeaning(v) !== targetMeaning &&
      getKoreanMeaning(v) &&
      v.partOfSpeech === target.partOfSpeech,
  );
  const diffPOS = allVocab.filter(
    (v) =>
      v.word !== target.word &&
      getKoreanMeaning(v) !== targetMeaning &&
      getKoreanMeaning(v) &&
      v.partOfSpeech !== target.partOfSpeech,
  );

  const distractors = [...shuffle([...samePOS]), ...shuffle([...diffPOS])].slice(0, 3);

  const correctLabel =
    type === 'word_to_meaning' ? targetMeaning : target.word;

  const distractorLabels = distractors.map((d) =>
    type === 'word_to_meaning' ? getKoreanMeaning(d) : d.word,
  );

  const options = [
    { label: correctLabel, isCorrect: true },
    ...distractorLabels.map((label) => ({ label, isCorrect: false })),
  ];

  // Pad if not enough distractors
  while (options.length < 4) {
    options.push({ label: '—', isCorrect: false });
  }

  return shuffle(options);
}

/** Calculate quiz result from array of correctness booleans */
export function calcQuizResult(answers: boolean[]): QuizResult {
  const totalQuestions = answers.length;
  const correctCount = answers.filter(Boolean).length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  return { totalQuestions, correctCount, score };
}
