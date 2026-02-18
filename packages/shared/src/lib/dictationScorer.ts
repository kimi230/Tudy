import type { DictationWordResult } from '../types';

function normalizeWord(word: string): string {
  // lowercase, remove punctuation except apostrophes
  return word
    .toLowerCase()
    .replace(/[^a-z0-9']/g, '');
}

function normalizeChineseChar(text: string): string[] {
  // Split into individual characters, remove spaces and punctuation
  return text.replace(/[\s，。！？、：；""''（）\u3000.,!?;:'"()\-\u200b]/g, '').split('');
}

function normalizeJapaneseChar(text: string): string[] {
  // Split into individual characters, remove punctuation
  return text.replace(/[\s。、！？「」『』（）・\u3000.,!?;:'"()\-\u200b]/g, '').split('');
}

function scoreByWords(
  expected: string,
  userInput: string
): { wordResults: DictationWordResult[]; score: number } {
  const expectedWords = expected.split(/\s+/).filter(Boolean);
  const actualWords = userInput.split(/\s+/).filter(Boolean);

  const normExpected = expectedWords.map(normalizeWord);
  const normActual = actualWords.map(normalizeWord);

  const m = normExpected.length;
  const n = normActual.length;

  if (m === 0) {
    return { wordResults: [], score: 100 };
  }

  // Build LCS DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (normExpected[i - 1] === normActual[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce alignment
  const aligned: { type: 'match' | 'miss' | 'extra'; ei?: number; ai?: number }[] = [];
  let i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normExpected[i - 1] === normActual[j - 1]) {
      aligned.push({ type: 'match', ei: i - 1, ai: j - 1 });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      aligned.push({ type: 'extra', ai: j - 1 });
      j--;
    } else {
      aligned.push({ type: 'miss', ei: i - 1 });
      i--;
    }
  }

  aligned.reverse();

  // Build results
  const results: DictationWordResult[] = [];
  let correct = 0;

  for (const item of aligned) {
    if (item.type === 'match') {
      results.push({ expected: expectedWords[item.ei!], actual: actualWords[item.ai!], isCorrect: true });
      correct++;
    } else if (item.type === 'miss') {
      results.push({ expected: expectedWords[item.ei!], actual: null, isCorrect: false });
    } else {
      // extra word typed by user — not penalized but shown
      results.push({ expected: '', actual: actualWords[item.ai!], isCorrect: false });
    }
  }

  const score = Math.round((correct / m) * 100);

  return { wordResults: results, score };
}

function scoreByChars(
  expected: string,
  userInput: string,
  normalizer: (text: string) => string[]
): { wordResults: DictationWordResult[]; score: number } {
  const expectedChars = normalizer(expected);
  const actualChars = normalizer(userInput);

  const m = expectedChars.length;
  const n = actualChars.length;

  if (m === 0) {
    return { wordResults: [], score: 100 };
  }

  // Build LCS DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (expectedChars[i - 1] === actualChars[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const aligned: { type: 'match' | 'miss' | 'extra'; ei?: number; ai?: number }[] = [];
  let i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && expectedChars[i - 1] === actualChars[j - 1]) {
      aligned.push({ type: 'match', ei: i - 1, ai: j - 1 });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      aligned.push({ type: 'extra', ai: j - 1 });
      j--;
    } else {
      aligned.push({ type: 'miss', ei: i - 1 });
      i--;
    }
  }

  aligned.reverse();

  const results: DictationWordResult[] = [];
  let correct = 0;

  for (const item of aligned) {
    if (item.type === 'match') {
      results.push({ expected: expectedChars[item.ei!], actual: actualChars[item.ai!], isCorrect: true });
      correct++;
    } else if (item.type === 'miss') {
      results.push({ expected: expectedChars[item.ei!], actual: null, isCorrect: false });
    } else {
      results.push({ expected: '', actual: actualChars[item.ai!], isCorrect: false });
    }
  }

  const score = Math.round((correct / m) * 100);

  return { wordResults: results, score };
}

export function scoreDictation(
  expected: string,
  userInput: string,
  language?: string
): { wordResults: DictationWordResult[]; score: number } {
  switch (language) {
    case 'zh':
      return scoreByChars(expected, userInput, normalizeChineseChar);
    case 'ja':
      return scoreByChars(expected, userInput, normalizeJapaneseChar);
    default:
      return scoreByWords(expected, userInput);
  }
}
