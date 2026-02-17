import { useAuth } from '../hooks/useAuth';
import { useRewards } from '../hooks/useRewards';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import XPBar from '../components/rewards/XPBar';
import StreakDisplay from '../components/rewards/StreakDisplay';
import BadgeGrid from '../components/rewards/BadgeGrid';

export default function Profile() {
  const { user, profile, loading } = useAuth();
  const { badges, recentXP, loading: rewardsLoading } = useRewards();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  if (loading || rewardsLoading) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (!user || !profile) return null;

  const avatarUrl = profile.avatar_url || user.user_metadata?.avatar_url;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={profile.display_name}
              className="w-16 h-16 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-indigo-600">
                {profile.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profile.display_name}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </div>

      {/* XP Bar */}
      <div className="mb-4">
        <XPBar totalXP={profile.total_xp} />
      </div>

      {/* Streak */}
      <div className="mb-6">
        <StreakDisplay
          currentStreak={profile.current_streak_days}
          longestStreak={profile.longest_streak_days}
        />
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">획득한 배지</h2>
        <BadgeGrid badges={badges} />
      </div>

      {/* Recent XP Events */}
      {recentXP.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">최근 XP 기록</h2>
          <div className="space-y-2">
            {recentXP.slice(0, 10).map((event) => (
              <div key={event.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-700">{formatEventType(event.event_type)}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(event.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <span className="text-sm font-medium text-indigo-600">+{event.xp_amount} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    step_complete: '학습 스텝 완료',
    session_complete: '학습 세션 완료',
    dictation_attempt: '딕테이션 시도',
    dictation_perfect: '딕테이션 만점',
    error_note_resolved: '오답노트 해결',
    daily_streak: '연속 학습',
  };
  return labels[type] ?? type;
}
