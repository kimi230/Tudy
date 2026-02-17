import type { DictationWordResult } from '../types';

function normalizeWord(word: string): string {
  // lowercase, remove punctuation except apostrophes
  return word
    .toLowerCase()
    .replace(/[^a-z0-9']/g, '');
}

export function scoreDictation(
  expected: string,
  userInput: string
): { wordResults: DictationWordResult[]; score: number } {
  const expectedWords = expected.split(/\s+/).filter(Boolean);
  const actualWords = userInput.split(/\s+/).filter(Boolean);

  const normExpected = expectedWords.map(normalizeWord);
  const normActual = actualWords.map(normalizeWord);

  const results: DictationWordResult[] = [];
  let ei = 0;
  let ai = 0;
  let correct = 0;

  while (ei < normExpected.length) {
    if (ai >= normActual.length) {
      // user ran out of words — remaining expected are missed
      results.push({ expected: expectedWords[ei], actual: null, isCorrect: false });
      ei++;
      continue;
    }

    if (normExpected[ei] === normActual[ai]) {
      results.push({ expected: expectedWords[ei], actual: actualWords[ai], isCorrect: true });
      correct++;
      ei++;
      ai++;
    } else {
      // lookahead: check if actual[ai] matches a nearby expected word
      let foundInExpected = -1;
      for (let look = 1; look <= 2 && ei + look < normExpected.length; look++) {
        if (normExpected[ei + look] === normActual[ai]) {
          foundInExpected = ei + look;
          break;
        }
      }

      // lookahead: check if expected[ei] matches a nearby actual word
      let foundInActual = -1;
      for (let look = 1; look <= 2 && ai + look < normActual.length; look++) {
        if (normActual[ai + look] === normExpected[ei]) {
          foundInActual = ai + look;
          break;
        }
      }

      if (foundInExpected >= 0 && (foundInActual < 0 || foundInExpected - ei <= foundInActual - ai)) {
        // user skipped some expected words
        for (let skip = ei; skip < foundInExpected; skip++) {
          results.push({ expected: expectedWords[skip], actual: null, isCorrect: false });
        }
        ei = foundInExpected;
        // don't advance ai — will match on next iteration
      } else if (foundInActual >= 0) {
        // user inserted extra words — skip actual words until match
        // mark current expected as wrong with current actual
        results.push({ expected: expectedWords[ei], actual: actualWords[ai], isCorrect: false });
        ei++;
        ai++;
      } else {
        // no match nearby — simple mismatch
        results.push({ expected: expectedWords[ei], actual: actualWords[ai], isCorrect: false });
        ei++;
        ai++;
      }
    }
  }

  const total = normExpected.length;
  const score = total === 0 ? 100 : Math.round((correct / total) * 100);

  return { wordResults: results, score };
}
