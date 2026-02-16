import { useRef, useEffect } from 'react';
import type { Segment, MarkedSegment } from '../../types';
import SegmentRow from './SegmentRow';

interface Props {
  segments: Segment[];
  currentTime: number;
  showKorean: boolean;
  highlightWords?: boolean;
  markedSegments?: MarkedSegment[];
  maxHeight?: string;
  onSegmentClick: (segment: Segment) => void;
  onMark?: (segmentIndex: number, color: 'blue' | 'red') => void;
}

export default function TranscriptPanel({
  segments,
  currentTime,
  showKorean,
  highlightWords,
  markedSegments,
  maxHeight = '60vh',
  onSegmentClick,
  onMark,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // Find active segment
  const activeIndex = segments.findIndex(
    (s) => currentTime >= s.start && currentTime < s.end
  );

  // Find highlighted word in active segment
  let highlightedWordIndex: number | undefined;
  if (highlightWords && activeIndex >= 0) {
    const seg = segments[activeIndex];
    highlightedWordIndex = seg.words.findIndex(
      (w) => currentTime >= w.start && currentTime < w.end
    );
    if (highlightedWordIndex === -1) highlightedWordIndex = undefined;
  }

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex]);

  const getMarkedColor = (index: number) => {
    return markedSegments?.find((m) => m.segmentIndex === index)?.color;
  };

  return (
    <div ref={containerRef} className="overflow-y-auto space-y-1" style={{ maxHeight }}>
      {segments.map((seg) => (
        <div key={seg.index} ref={seg.index === activeIndex ? activeRef : undefined}>
          <SegmentRow
            segment={seg}
            isActive={seg.index === activeIndex}
            showKorean={showKorean}
            highlightedWordIndex={seg.index === activeIndex ? highlightedWordIndex : undefined}
            markedColor={getMarkedColor(seg.index)}
            onClick={() => onSegmentClick(seg)}
            onMark={onMark ? (color) => onMark(seg.index, color) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
