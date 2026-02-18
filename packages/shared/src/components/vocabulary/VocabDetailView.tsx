import type { VocabularyItem } from '../../types';
import { getDefaultLanguage } from '../../lib/supabaseSync';
import EtymologyView from './EtymologyView';

interface Props {
  item: VocabularyItem;
}

/** Language-aware vocabulary detail view */
export default function VocabDetailView({ item }: Props) {
  const lang = getDefaultLanguage();

  if (lang === 'zh') {
    return <ChineseVocabDetail item={item} />;
  }
  if (lang === 'ja') {
    return <JapaneseVocabDetail item={item} />;
  }
  return <EtymologyView item={item} />;
}

function ChineseVocabDetail({ item }: Props) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-red-800 mb-1">한자 분석</h4>
      <p className="text-lg font-bold text-gray-900 mb-1">
        {item.word}
        {item.isEssential && (
          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
            핵심 단어
          </span>
        )}
      </p>
      {item.pinyin && (
        <p className="text-sm text-red-600 mb-2">{item.pinyin}</p>
      )}
      {item.hskLevel != null && (
        <span className="inline-block text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full mb-2">
          HSK {item.hskLevel}
        </span>
      )}
      {item.tones && item.tones.length > 0 && (
        <p className="text-xs text-gray-600 mb-2">성조: {item.tones.join('-')}</p>
      )}

      {/* Character breakdown */}
      {item.components && item.components.length > 0 && (
        <div className="mt-3 bg-white/60 rounded-lg p-3">
          <p className="text-xs font-medium text-red-700 mb-2">한자 분해</p>
          <div className="flex items-center gap-1 flex-wrap">
            {item.components.map((comp, i) => (
              <div key={i} className="bg-white text-center px-2 py-1 rounded border border-red-200">
                <span className="text-sm font-bold text-gray-900">{comp.character}</span>
                <p className="text-[10px] text-red-600">{comp.pinyin}</p>
                <p className="text-[10px] text-gray-500">{comp.meaning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {item.measureWord && (
        <p className="text-xs text-gray-600 mt-2">양사: {item.measureWord}</p>
      )}

      <div className="mt-3 pt-3 border-t border-red-200">
        <p className="text-sm text-gray-600">{item.definition}</p>
        <p className="text-sm text-indigo-600 font-medium mt-1">{item.koreanMeaning}</p>
      </div>
    </div>
  );
}

function JapaneseVocabDetail({ item }: Props) {
  return (
    <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-pink-800 mb-1">단어 분석</h4>
      <p className="text-lg font-bold text-gray-900 mb-1">
        {item.word}
        {item.isEssential && (
          <span className="ml-2 text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium">
            핵심 단어
          </span>
        )}
      </p>
      {item.reading && (
        <p className="text-sm text-pink-600 mb-2">{item.reading}</p>
      )}
      {item.jlptLevel != null && (
        <span className="inline-block text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full mb-2">
          JLPT N{item.jlptLevel}
        </span>
      )}

      {/* Kanji readings */}
      {item.kanjiReadings && item.kanjiReadings.length > 0 && (
        <div className="mt-3 bg-white/60 rounded-lg p-3">
          <p className="text-xs font-medium text-pink-700 mb-2">한자 읽기</p>
          <div className="space-y-1">
            {item.kanjiReadings.map((kr, i) => (
              <div key={i} className="text-xs">
                <span className="font-bold text-gray-900">{kr.kanji}</span>
                {kr.onyomi.length > 0 && (
                  <span className="text-pink-600 ml-2">음독: {kr.onyomi.join(', ')}</span>
                )}
                {kr.kunyomi.length > 0 && (
                  <span className="text-blue-600 ml-2">훈독: {kr.kunyomi.join(', ')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {item.pitchAccent && item.pitchAccent.length > 0 && (
        <p className="text-xs text-gray-600 mt-2">피치 악센트: {item.pitchAccent.join('-')}</p>
      )}

      <div className="mt-3 pt-3 border-t border-pink-200">
        <p className="text-sm text-gray-600">{item.definition}</p>
        <p className="text-sm text-indigo-600 font-medium mt-1">{item.koreanMeaning}</p>
      </div>
    </div>
  );
}
