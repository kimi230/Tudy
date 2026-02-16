import type { VocabularyItem } from '../../types';

interface Props {
  item: VocabularyItem;
}

export default function EtymologyView({ item }: Props) {
  const bd = item.rootBreakdown;
  const hasBreakdown = bd && bd.root;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-amber-800 mb-1">어원 (Etymology)</h4>
      <p className="text-lg font-bold text-gray-900 mb-2">
        {item.word}
        {item.isEssential && (
          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
            핵심 단어
          </span>
        )}
      </p>
      <p className="text-sm text-gray-700 leading-relaxed">{item.etymology}</p>

      {/* Root Breakdown visualization */}
      {hasBreakdown && (
        <div className="mt-3 bg-white/60 rounded-lg p-3">
          <p className="text-xs font-medium text-amber-700 mb-2">어근 분해</p>
          <div className="flex items-center gap-1 flex-wrap">
            {bd.prefix && (
              <>
                <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded font-mono">
                  {bd.prefix}
                </span>
                <span className="text-gray-400">+</span>
              </>
            )}
            <span className="bg-amber-100 text-amber-900 text-sm px-2 py-1 rounded font-mono font-bold">
              {bd.root}
            </span>
            {bd.suffix && (
              <>
                <span className="text-gray-400">+</span>
                <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded font-mono">
                  {bd.suffix}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Related words */}
      {item.relatedWords && item.relatedWords.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-amber-700 mb-1">같은 어원의 단어들</p>
          <div className="flex flex-wrap gap-1">
            {item.relatedWords.map((rw, i) => (
              <span key={i} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                {rw}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-amber-200">
        <p className="text-xs text-gray-500">{item.phonetic}</p>
        <p className="text-sm text-gray-600 mt-1">{item.definition}</p>
        <p className="text-sm text-indigo-600 font-medium mt-1">{item.koreanMeaning}</p>
      </div>
    </div>
  );
}
