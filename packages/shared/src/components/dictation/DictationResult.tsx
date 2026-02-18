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
            // extra word typed by user (not in original)
            return (
              <span key={i} className="text-sm text-orange-400 line-through" title="원문에 없는 단어">{wr.actual}</span>
            );
          }
          if (wr.actual === null) {
            // missed word
            return (
              <span key={i} className="text-sm text-red-600 border-b-2 border-red-400 px-1" title="빠뜨린 단어">
                {wr.expected}
              </span>
            );
          }
          // wrong word
          return (
            <span key={i} className="text-sm" title="틀린 단어">
              <span className="text-red-500 line-through">{wr.actual}</span>
              <span className="text-green-700 ml-0.5">{wr.expected}</span>
            </span>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-gray-400">
        <span><span className="text-green-700">■</span> 정답</span>
        <span><span className="text-red-600">■</span> 빠뜨림/오답</span>
        <span><span className="text-orange-400">■</span> 불필요한 단어</span>
      </div>
      <p className={`text-sm font-semibold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
        {score}%
      </p>
    </div>
  );
}
