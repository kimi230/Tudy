import type { DictationWordResult } from '../../types';

interface Props {
  wordResults: DictationWordResult[];
  score: number;
}

export default function DictationResult({ wordResults, score }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {wordResults.map((wr, i) => {
          if (wr.isCorrect) {
            return (
              <span key={i} className="text-sm text-green-700">{wr.expected}</span>
            );
          }
          if (wr.expected === '' && wr.actual) {
            // extra word typed by user (not penalized)
            return (
              <span key={i} className="text-sm text-gray-400 line-through">{wr.actual}</span>
            );
          }
          if (wr.actual === null) {
            // missed word
            return (
              <span key={i} className="text-sm text-red-600 border-b-2 border-red-400 px-1">
                {wr.expected}
              </span>
            );
          }
          // wrong word
          return (
            <span key={i} className="text-sm">
              <span className="text-red-500 line-through">{wr.actual}</span>
              <span className="text-green-700 ml-0.5">{wr.expected}</span>
            </span>
          );
        })}
      </div>
      <p className={`text-sm font-semibold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
        {score}%
      </p>
    </div>
  );
}
