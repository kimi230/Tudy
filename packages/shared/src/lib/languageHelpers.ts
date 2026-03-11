import type { Segment } from '../types';
import { getDefaultLanguage } from './supabaseSync';

export function getSegmentText(seg: Segment): string {
  const lang = getDefaultLanguage();
  switch (lang) {
    case 'zh': return seg.textZh ?? '';
    case 'ja': return seg.textJa ?? '';
    default: return seg.textEn ?? '';
  }
}

export function getSegmentReading(seg: Segment): string | undefined {
  const lang = getDefaultLanguage();
  switch (lang) {
    case 'zh': return seg.pinyin;
    case 'ja': return seg.reading;
    default: return undefined;
  }
}

export function getLanguageLabel(): string {
  const lang = getDefaultLanguage();
  switch (lang) {
    case 'zh': return '중국어';
    case 'ja': return '일본어';
    default: return '영어';
  }
}

export function getDictationPlaceholder(): string {
  const lang = getDefaultLanguage();
  switch (lang) {
    case 'zh': return '중국어로 입력...';
    case 'ja': return '일본어로 입력...';
    default: return '영어로 입력...';
  }
}

export function getErrorTypeLabels(): Record<string, string> {
  const lang = getDefaultLanguage();
  switch (lang) {
    case 'zh':
      return {
        vocabulary: '어휘',
        grammar: '문법',
        connected_speech: '성조',
        pronunciation: '발음',
      };
    case 'ja':
      return {
        vocabulary: '어휘',
        grammar: '문법',
        connected_speech: '경어',
        pronunciation: '발음',
      };
    default:
      return {
        vocabulary: '어휘',
        grammar: '문법',
        connected_speech: '연음',
        pronunciation: '발음',
      };
  }
}

export function getConnectedSpeechLabel(): string {
  const lang = getDefaultLanguage();
  switch (lang) {
    case 'zh': return '성조';
    case 'ja': return '경어';
    default: return '연음';
  }
}

export function getVocabPhonetic(item: { phonetic?: string; pinyin?: string; reading?: string }): string {
  const lang = getDefaultLanguage();
  switch (lang) {
    case 'zh': return item.pinyin ?? '';
    case 'ja': return item.reading ?? '';
    default: return item.phonetic ?? '';
  }
}

/** Get Korean meaning from vocabulary item — handles both `koreanMeaning` and `meaningKo` field names */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getKoreanMeaning(item: any): string {
  return item.koreanMeaning ?? item.meaningKo ?? item.definition ?? '';
}

export interface ThemeColors {
  text600: string;
  bg100: string;
  bg500: string;
  bg600: string;
  hoverBg600: string;
  hoverBg700: string;
  hoverBorder300: string;
  hoverText600: string;
  groupHoverText600: string;
  focusRing500: string;
  focusBorder500: string;
  shadow200: string;
  border600: string;
  bg50: string;
  text700: string;
}

const THEME_EN: ThemeColors = {
  text600: 'text-indigo-600',
  bg100: 'bg-indigo-100',
  bg500: 'bg-indigo-500',
  bg600: 'bg-indigo-600',
  hoverBg600: 'hover:bg-indigo-600',
  hoverBg700: 'hover:bg-indigo-700',
  hoverBorder300: 'hover:border-indigo-300',
  hoverText600: 'hover:text-indigo-600',
  groupHoverText600: 'group-hover:text-indigo-600',
  focusRing500: 'focus:ring-indigo-500',
  focusBorder500: 'focus:border-indigo-500',
  shadow200: 'shadow-indigo-200/50',
  border600: 'border-indigo-600',
  bg50: 'bg-indigo-50',
  text700: 'text-indigo-700',
};

const THEME_ZH: ThemeColors = {
  text600: 'text-red-600',
  bg100: 'bg-red-100',
  bg500: 'bg-red-500',
  bg600: 'bg-red-600',
  hoverBg600: 'hover:bg-red-600',
  hoverBg700: 'hover:bg-red-700',
  hoverBorder300: 'hover:border-red-300',
  hoverText600: 'hover:text-red-600',
  groupHoverText600: 'group-hover:text-red-600',
  focusRing500: 'focus:ring-red-500',
  focusBorder500: 'focus:border-red-500',
  shadow200: 'shadow-red-200/50',
  border600: 'border-red-600',
  bg50: 'bg-red-50',
  text700: 'text-red-700',
};

const THEME_JA: ThemeColors = {
  text600: 'text-pink-600',
  bg100: 'bg-pink-100',
  bg500: 'bg-pink-500',
  bg600: 'bg-pink-600',
  hoverBg600: 'hover:bg-pink-600',
  hoverBg700: 'hover:bg-pink-700',
  hoverBorder300: 'hover:border-pink-300',
  hoverText600: 'hover:text-pink-600',
  groupHoverText600: 'group-hover:text-pink-600',
  focusRing500: 'focus:ring-pink-500',
  focusBorder500: 'focus:border-pink-500',
  shadow200: 'shadow-pink-200/50',
  border600: 'border-pink-600',
  bg50: 'bg-pink-50',
  text700: 'text-pink-700',
};

export function getThemeColors(): ThemeColors {
  const lang = getDefaultLanguage();
  switch (lang) {
    case 'zh': return THEME_ZH;
    case 'ja': return THEME_JA;
    default: return THEME_EN;
  }
}
