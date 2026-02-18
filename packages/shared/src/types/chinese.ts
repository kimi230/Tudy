import type { WordTimestamp } from './index.ts';

// Chinese Segment
export interface ZhSegment {
  index: number;
  start: number;
  end: number;
  textZh: string;
  pinyin: string;
  textKo: string;
  words: WordTimestamp[];
  listenDifficulty?: number;
}

// Chinese Vocabulary Item
export interface ZhCharacterBreakdown {
  character: string;
  pinyin: string;
  meaning: string;
}

export interface ZhVocabularyItem {
  word: string;
  pinyin: string;
  tones: number[];
  partOfSpeech: string;
  definition: string;
  koreanMeaning: string;
  hskLevel: number | null;
  measureWord?: string;
  components?: ZhCharacterBreakdown[];
  isEssential?: boolean;
  segmentIndex: number;
  contextSentence: string;
}

// Chinese Tone Phenomenon (replaces connected_speech for Chinese)
export interface ZhTonePhenomenon {
  type: 'tone_sandhi' | 'neutral_tone' | 'er_hua' | 'similar_sounds';
  originalText: string;
  pinyin: string;
  toneChange: string;
  explanationKo: string;
  practiceGuide: string;
  segmentIndex: number;
}

// Chinese difficulty levels
export type ZhDifficulty = 'hsk1-2' | 'hsk3-4' | 'hsk5-6';
