import type { Segment } from '../../types';

export type DifficultyFilter = 'easy' | 'medium' | 'hard' | 'all';

interface Props {
  segments: Segment[];
  onSelect: (filter: DifficultyFilter) => void;
}

export default function DifficultySelector({ segments, onSelect }: Props) {
  const hasDifficulty = segments.some((s) => s.listenDifficulty != null);

  const counts = {
    easy: segments.filter((s) => s.listenDifficulty != null && s.listenDifficulty <= 2).length,
    medium: segments.filter((s) => s.listenDifficulty === 3).length,
    hard: segments.filter((s) => s.listenDifficulty != null && s.listenDifficulty >= 4).length,
    all: segments.length,
  };

  if (!hasDifficulty) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">이 영상에는 난이도 데이터가 없습니다. 전체 세그먼트로 연습합니다.</p>
        <button
          onClick={() => onSelect('all')}
          className="w-full py-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors"
        >
          전체 세그먼트로 시작 ({counts.all}개)
        </button>
      </div>
    );
  }

  const options: { key: DifficultyFilter; label: string; count: number; colors: string }[] = [
    { key: 'easy', label: 'Easy (1-2)', count: counts.easy, colors: 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100' },
    { key: 'medium', label: 'Medium (3)', count: counts.medium, colors: 'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100' },
    { key: 'hard', label: 'Hard (4-5)', count: counts.hard, colors: 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100' },
    { key: 'all', label: 'All', count: counts.all, colors: 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">난이도 선택</h3>
        <p className="text-xs text-gray-500">연습할 세그먼트의 듣기 난이도를 선택하세요</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt.key}
            disabled={opt.count === 0}
            onClick={() => onSelect(opt.key)}
            className={`py-3 px-4 rounded-lg text-sm font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${opt.colors}`}
          >
            <div>{opt.label}</div>
            <div className="text-xs mt-0.5 opacity-75">{opt.count}개 세그먼트</div>
          </button>
        ))}
      </div>
    </div>
  );
}
