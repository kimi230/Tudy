import { getDifficultyLabel } from '../../lib/dataLoader';

interface Props {
  difficulty: string;
}

const colorMap: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

export default function DifficultyBadge({ difficulty }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorMap[difficulty] || 'bg-gray-100 text-gray-700'}`}>
      {getDifficultyLabel(difficulty)}
    </span>
  );
}
