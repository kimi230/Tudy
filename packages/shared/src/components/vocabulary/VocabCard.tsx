import type { VocabularyItem } from '../../types';
import { getVocabPhonetic, getKoreanMeaning } from '../../lib/languageHelpers';

interface Props {
  item: VocabularyItem;
  onClick?: () => void;
}

export default function VocabCard({ item, onClick }: Props) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-lg font-semibold text-gray-900">{item.word}</h4>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
          {item.partOfSpeech}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-1">{getVocabPhonetic(item)}</p>
      <p className="text-sm text-gray-700 mb-2">{item.definition}</p>
      <p className="text-sm text-indigo-600 font-medium">{getKoreanMeaning(item)}</p>
      <p className="text-xs text-gray-400 mt-2 italic">"{item.contextSentence}"</p>
    </div>
  );
}
