import { useAuth } from '../hooks/useAuth';
import { useRewards } from '../hooks/useRewards';
import { useDailyLearning } from '../hooks/useDailyLearning';
import { loadVideos } from '../lib/dataLoader';
import { getAllSessionsFromCloud } from '../lib/supabaseSync';
import { supabase } from '../lib/supabase';
import XPBar from '../components/rewards/XPBar';
import StreakDisplay from '../components/rewards/StreakDisplay';
import BadgeGrid from '../components/rewards/BadgeGrid';
import { getThemeColors } from '../lib/languageHelpers';
import type { VideoEntry, StudySession } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Profile() {
  const { user, profile, loading } = useAuth();
  const { badges, recentXP, loading: rewardsLoading } = useRewards();
  const { allProgress: dailyProgress, loading: dailyLoading } = useDailyLearning();
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [dictationStats, setDictationStats] = useState<Map<string, number>>(new Map());
  const [videos, setVideos] = useState<Map<string, VideoEntry>>(new Map());
  const [progressLoading, setProgressLoading] = useState(true);
  const navigate = useNavigate();
  const t = getThemeColors();

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user?.id) { setProgressLoading(false); return; }
    const uid = user.id;

    Promise.all([
      getAllSessionsFromCloud(uid),
      supabase
        ? supabase
            .from('dictation_attempts')
            .select('video_id, segment_index')
            .eq('user_id', uid)
        : Promise.resolve({ data: null }),
      loadVideos(),
    ])
      .then(([sessions, dictResult, videoList]) => {
        setStudySessions(sessions);

        const dictMap = new Map<string, Set<number>>();
        if (dictResult.data) {
          for (const row of dictResult.data as { video_id: string; segment_index: number }[]) {
            const set = dictMap.get(row.video_id) ?? new Set();
            set.add(row.segment_index);
            dictMap.set(row.video_id, set);
          }
        }
        const countMap = new Map<string, number>();
        for (const [vid, set] of dictMap) countMap.set(vid, set.size);
        setDictationStats(countMap);

        const vMap = new Map<string, VideoEntry>();
        for (const v of videoList) vMap.set(v.videoId, v);
        setVideos(vMap);
      })
      .finally(() => setProgressLoading(false));
  }, [user?.id]);

  if (loading || rewardsLoading) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className={`animate-spin w-8 h-8 border-4 ${t.border600} border-t-transparent rounded-full mx-auto`} />
      </div>
    );
  }

  if (!user || !profile) return null;

  const avatarUrl = profile.avatar_url || user.user_metadata?.avatar_url;

  const studyByVideo = new Map<string, StudySession>();
  for (const s of studySessions) {
    if (!studyByVideo.has(s.videoId)) studyByVideo.set(s.videoId, s);
  }

  const dailyInProgress = dailyProgress.filter((p) => !p.completedAt && p.totalSegments > 0);
  const dailyCompleted = dailyProgress.filter((p) => !!p.completedAt);
  const studyInProgress = Array.from(studyByVideo.values()).filter((s) => !s.completedAt);
  const dictationEntries = Array.from(dictationStats.entries());

  const hasAnyProgress = dailyInProgress.length > 0 || dailyCompleted.length > 0 ||
    studyInProgress.length > 0 || dictationEntries.length > 0;

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
            <div className={`w-16 h-16 rounded-full ${t.bg100} flex items-center justify-center`}>
              <span className={`text-2xl font-bold ${t.text600}`}>
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

      {/* Learning Progress */}
      {!progressLoading && !dailyLoading && hasAnyProgress && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">학습 현황</h2>
          <div className="space-y-4">
            {(dailyInProgress.length > 0 || dailyCompleted.length > 0) && (
              <ProgressSection
                title="오늘의 학습"
                color="emerald"
                items={[...dailyInProgress, ...dailyCompleted].map((p) => {
                  const v = videos.get(p.videoId);
                  const pct = p.totalSegments > 0
                    ? Math.round((p.nextSegmentIndex / p.totalSegments) * 100)
                    : 0;
                  return {
                    videoId: p.videoId,
                    title: v?.title ?? p.videoId,
                    thumbnail: v?.thumbnail,
                    detail: p.completedAt
                      ? '완료'
                      : `${pct}% (${p.nextSegmentIndex}/${p.totalSegments})`,
                    pct: p.completedAt ? 100 : pct,
                    isCompleted: !!p.completedAt,
                    linkTo: '/daily',
                  };
                })}
              />
            )}

            {studyInProgress.length > 0 && (
              <ProgressSection
                title="10단계 학습"
                color="theme"
                themeBar={t.bg500}
                themeBg={t.bg50}
                themeText={t.text700}
                items={studyInProgress.map((s) => {
                  const v = videos.get(s.videoId);
                  return {
                    videoId: s.videoId,
                    title: v?.title ?? s.videoId,
                    thumbnail: v?.thumbnail,
                    detail: `Step ${s.currentStep}/10`,
                    pct: s.currentStep * 10,
                    isCompleted: false,
                    linkTo: `/study/${s.videoId}`,
                  };
                })}
              />
            )}

            {dictationEntries.length > 0 && (
              <ProgressSection
                title="딕테이션"
                color="amber"
                items={dictationEntries.map(([videoId, count]) => {
                  const v = videos.get(videoId);
                  return {
                    videoId,
                    title: v?.title ?? videoId,
                    thumbnail: v?.thumbnail,
                    detail: `${count}개 문장 시도`,
                    pct: 0,
                    isCompleted: false,
                    linkTo: `/dictation/${videoId}`,
                  };
                })}
              />
            )}
          </div>
        </div>
      )}

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
                <span className={`text-sm font-medium ${t.text600}`}>+{event.xp_amount} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ProgressItem {
  videoId: string;
  title: string;
  thumbnail?: string;
  detail: string;
  pct: number;
  isCompleted: boolean;
  linkTo: string;
}

function ProgressSection({
  title,
  color,
  items,
  themeBar,
  themeBg,
  themeText,
}: {
  title: string;
  color: 'emerald' | 'amber' | 'theme';
  items: ProgressItem[];
  themeBar?: string;
  themeBg?: string;
  themeText?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; bar: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
    theme: { bg: themeBg ?? 'bg-indigo-50', text: themeText ?? 'text-indigo-700', bar: themeBar ?? 'bg-indigo-500' },
  };
  const c = colorMap[color];

  return (
    <div>
      <h3 className={`text-xs font-semibold ${c.text} ${c.bg} inline-block px-2 py-0.5 rounded-full mb-2`}>
        {title}
      </h3>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <Link
            key={item.videoId}
            to={item.linkTo}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {item.thumbnail && (
              <img src={item.thumbnail} alt="" className="w-12 h-8 rounded object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">{item.title}</p>
              {item.pct > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div
                    className={`h-1 rounded-full ${item.isCompleted ? 'bg-green-500' : c.bar}`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              )}
            </div>
            <span className={`text-xs font-medium flex-shrink-0 ${
              item.isCompleted ? 'text-green-600' : 'text-gray-500'
            }`}>
              {item.detail}
            </span>
          </Link>
        ))}
      </div>
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
    daily_session_complete: '오늘의 학습 완료',
  };
  return labels[type] ?? type;
}
