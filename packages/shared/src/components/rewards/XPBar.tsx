interface XPBarProps {
  totalXP: number;
}

function getLevel(xp: number): { level: number; currentXP: number; nextLevelXP: number } {
  // Each level requires progressively more XP: level N needs N*100 XP
  let level = 1;
  let remaining = xp;
  while (remaining >= level * 100) {
    remaining -= level * 100;
    level++;
  }
  return { level, currentXP: remaining, nextLevelXP: level * 100 };
}

export default function XPBar({ totalXP }: XPBarProps) {
  const { level, currentXP, nextLevelXP } = getLevel(totalXP);
  const progress = (currentXP / nextLevelXP) * 100;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-indigo-600">Lv.{level}</span>
          <span className="text-sm text-gray-500">{totalXP} XP</span>
        </div>
        <span className="text-xs text-gray-400">
          다음 레벨까지 {nextLevelXP - currentXP} XP
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div
          className="bg-indigo-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
