import type { WordTimestamp } from './index.ts';

// Japanese Segment
export interface JaSegment {
  index: number;
  start: number;
  end: number;
  textJa: string;
  reading: string;
  textKo: string;
  words: WordTimestamp[];
  listenDifficulty?: number;
}

// Japanese Vocabulary Item
export interface JaKanjiReading {
  kanji: string;
  onyomi: string[];
  kunyomi: string[];
}

export interface JaVocabularyItem {
  word: string;
  reading: string;
  kanji?: string;
  partOfSpeech: string;
  definition: string;
  koreanMeaning: string;
  jlptLevel: number | null;
  pitchAccent?: number[];
  kanjiReadings?: JaKanjiReading[];
  isEssential?: boolean;
  segmentIndex: number;
  contextSentence: string;
}

// Japanese Keigo Phenomenon (replaces connected_speech for Japanese)
export interface JaKeigoPhenomenon {
  type: 'sonkeigo' | 'kenjougo' | 'teineigo' | 'casual';
  originalText: string;
  reading: string;
  baseForm: string;
  politeLevel: string;
  explanationKo: string;
  usageContext: string;
  segmentIndex: number;
}

// Japanese difficulty levels
export type JaDifficulty = 'n5-n4' | 'n3' | 'n2-n1';
