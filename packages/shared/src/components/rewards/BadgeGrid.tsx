import type { UserBadge } from '../../hooks/useRewards';

interface BadgeGridProps {
  badges: UserBadge[];
}

export default function BadgeGrid({ badges }: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-400">아직 획득한 배지가 없습니다. 학습을 시작해보세요!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:shadow-md transition-shadow"
        >
          <div className="text-3xl mb-2">{badge.icon}</div>
          <p className="text-sm font-medium text-gray-900">{badge.name_ko}</p>
          <p className="text-xs text-gray-500 mt-1">{badge.description_ko}</p>
          <p className="text-xs text-indigo-500 mt-2">
            +{badge.xp_reward} XP
          </p>
        </div>
      ))}
    </div>
  );
}
