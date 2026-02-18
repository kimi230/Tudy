interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
}

export default function StreakDisplay({ currentStreak, longestStreak }: StreakDisplayProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 23a7.5 7.5 0 01-5.138-12.963C8.204 8.774 11.5 6.5 11 1.5c6 4 9 8 3 14 1 0 2.5 0 5-2.47.27.97.5 1.47.5 3.5A7.5 7.5 0 0112 23z" />
          </svg>
        </div>
        <div>
          <p className="text-2xl font-bold text-orange-500">{currentStreak}일</p>
          <p className="text-xs text-gray-500">
            연속 학습 {currentStreak > 0 ? '중' : '시작해보세요'}
            {longestStreak > 0 && ` | 최장 ${longestStreak}일`}
          </p>
        </div>
      </div>
    </div>
  );
}
