import { memo } from 'react';
import type { Segment } from '../../types';
import { formatTime } from '../../lib/youtube';

interface Props {
  segment: Segment;
  isActive: boolean;
  showKorean: boolean;
  highlightedWordIndex?: number;
  markedColor?: 'blue' | 'red';
  compact?: boolean;
  onClick: () => void;
  onMark?: (color: 'blue' | 'red') => void;
}

export default memo(function SegmentRow({
  segment,
  isActive,
  showKorean,
  highlightedWordIndex,
  markedColor,
  compact,
  onClick,
  onMark,
}: Props) {
  const bgColor = markedColor === 'blue'
    ? 'bg-blue-50 border-blue-200'
    : markedColor === 'red'
    ? 'bg-red-50 border-red-200'
    : isActive
    ? 'bg-indigo-50 border-indigo-200'
    : 'bg-white border-transparent hover:bg-gray-50';

  return (
    <div
      className={`flex gap-3 ${compact ? 'p-2' : 'p-3'} border rounded-lg cursor-pointer transition-colors ${bgColor}`}
      onClick={onClick}
    >
      <span className="text-xs text-gray-400 w-12 shrink-0 pt-0.5 flex items-center gap-1">
        {formatTime(segment.start)}
        {segment.listenDifficulty != null && (
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
              segment.listenDifficulty <= 2
                ? 'bg-green-400'
                : segment.listenDifficulty === 3
                ? 'bg-yellow-400'
                : 'bg-red-400'
            }`}
            title={`듣기 난이도 ${segment.listenDifficulty}/5`}
          />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm text-gray-900 ${compact ? 'leading-snug' : 'leading-relaxed'}`}>
          {segment.words.map((w, i) => (
            <span
              key={i}
              className={highlightedWordIndex === i ? 'bg-yellow-300 rounded px-0.5' : ''}
            >
              {w.word}{' '}
            </span>
          ))}
        </p>
        {showKorean && segment.textKo && (
          <p className="text-sm text-gray-500 mt-1">{segment.textKo}</p>
        )}
      </div>
      {onMark && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onMark('blue'); }}
            className="w-6 h-6 rounded bg-blue-200 hover:bg-blue-300 text-xs"
            title="이해됨"
          />
          <button
            onClick={(e) => { e.stopPropagation(); onMark('red'); }}
            className="w-6 h-6 rounded bg-red-200 hover:bg-red-300 text-xs"
            title="안 들림"
          />
        </div>
      )}
    </div>
  );
});
