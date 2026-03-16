import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRewards } from '../hooks/useRewards';
import { useDailyLearning } from '../hooks/useDailyLearning';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { loadVideos, loadCategories } from '../lib/dataLoader';
import { getAllSessionsFromCloud } from '../lib/supabaseSync';
import { getThemeColors, getLanguageLabel } from '../lib/languageHelpers';
import VideoModeModal from '../components/common/VideoModeModal';
import type { VideoEntry, StudySession, Category } from '../types';

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const { loading: rewardsLoading } = useRewards();
  const { allProgress: dailyProgress, loading: dailyLoading } = useDailyLearning();
  const { stats, loading: statsLoading } = useDashboardStats();
  const navigate = useNavigate();
  const t = getThemeColors();
  const langLabel = getLanguageLabel();

  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [videoMap, setVideoMap] = useState<Map<string, VideoEntry>>(new Map());
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoEntry | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    loadVideos().then((vList) => {
      setVideos(vList);
      const m = new Map<string, VideoEntry>();
      for (const v of vList) m.set(v.videoId, v);
      setVideoMap(m);
    });
    loadCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!user?.id) { setProgressLoading(false); return; }
    getAllSessionsFromCloud(user.id)
      .then(setStudySessions)
      .finally(() => setProgressLoading(false));
  }, [user?.id]);

  if (authLoading || rewardsLoading) {
    return (
      <div className="max-w-4xl mx-auto mt-20 text-center">
        <div className={`animate-spin w-8 h-8 border-4 ${t.border600} border-t-transparent rounded-full mx-auto`} />
      </div>
    );
  }

  if (!user || !profile) return null;

  const avatarUrl = profile.avatar_url || user.user_metadata?.avatar_url;
  const { level, currentXP, nextLevelXP } = getLevel(profile.total_xp);
  const xpProgress = (currentXP / nextLevelXP) * 100;

  // Continue learning data
  const studyByVideo = new Map<string, StudySession>();
  for (const s of studySessions) {
    if (!studyByVideo.has(s.videoId)) studyByVideo.set(s.videoId, s);
  }
  const isCompleted = (s: StudySession) => s.completedAt || s.currentStep >= 10;
  const studyInProgress = Array.from(studyByVideo.values()).filter((s) => !isCompleted(s));
  const studyCompleted = Array.from(studyByVideo.values()).filter((s) => isCompleted(s));
  const dailyInProgress = dailyProgress.filter((p) => !p.completedAt && p.totalSegments > 0);

  const continueItems: { title: string; subtitle: string; linkTo: string; thumbnail?: string; type: string }[] = [];

  for (const s of studyInProgress.slice(0, 2)) {
    const v = videoMap.get(s.videoId);
    continueItems.push({
      title: v?.title ?? s.videoId,
      subtitle: `10단계 학습 · Step ${s.currentStep}/10`,
      linkTo: `/study/${s.videoId}`,
      thumbnail: v?.thumbnail,
      type: 'study',
    });
  }
  for (const p of dailyInProgress.slice(0, 1)) {
    const v = videoMap.get(p.videoId);
    const pct = p.totalSegments > 0 ? Math.round((p.nextSegmentIndex / p.totalSegments) * 100) : 0;
    continueItems.push({
      title: v?.title ?? p.videoId,
      subtitle: `오늘의 학습 · ${pct}%`,
      linkTo: '/daily',
      thumbnail: v?.thumbnail,
      type: 'daily',
    });
  }

  // Video browse
  const countByCategory = (catId: string) => videos.filter((v) => v.categoryId === catId).length;
  const sortedVideos = [...videos].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  const filteredVideos = selectedCategory ? sortedVideos.filter((v) => v.categoryId === selectedCategory) : sortedVideos;
  const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const isRecent = (v: VideoEntry) => new Date(v.addedAt).getTime() > recentCutoff;

  // Weekly stats helpers
  const formatHours = (sec: number) => {
    if (sec < 3600) return `${Math.round(sec / 60)}분`;
    return `${(sec / 3600).toFixed(1)}시간`;
  };

  const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  // --- Sidebar content (shared between mobile & desktop) ---
  const sidebarContent = (
    <>
      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <Link to="/profile" className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className={`w-12 h-12 rounded-full ${t.bg100} flex items-center justify-center`}>
              <span className={`text-base font-bold ${t.text600}`}>{profile.display_name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900">{profile.display_name}님</p>
            <p className="text-xs text-gray-400">프로필 보기</p>
          </div>
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <span className={`text-sm font-bold ${t.text600}`}>Lv.{level}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div
              className={`${t.bg500} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{currentXP}/{nextLevelXP}</span>
        </div>

        {profile.current_streak_days > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-orange-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 23a7.5 7.5 0 01-5.138-12.963C8.204 8.774 11.5 6.5 11 1.5c6 4 9 8 3 14 1 0 2.5 0 5-2.47.27.97.5 1.47.5 3.5A7.5 7.5 0 0112 23z" />
            </svg>
            <span className="text-sm font-bold">{profile.current_streak_days}일 연속 학습</span>
          </div>
        )}
      </div>

      {/* Weekly Stats */}
      {!statsLoading && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-2">이번 주 통계</h2>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="학습 영상" value={`${stats.videosStudied}개`} color={t.text600} />
            <StatCard label="학습시간" value={formatHours(stats.totalStudyTimeSec)} color="text-emerald-600" />
            <StatCard label="딕테이션" value={stats.dictationAccuracy > 0 ? `${stats.dictationAccuracy}%` : '-'} color="text-amber-600" />
            <StatCard label="오답 해결" value={`${stats.errorsResolved}개`} color="text-rose-600" />
          </div>
        </div>
      )}

      {/* Weekly Activity Heatmap */}
      {!statsLoading && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-2">주간 활동</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-center justify-between gap-1.5">
              {DAY_LABELS.map((label, i) => {
                const isActive = stats.activeDays[i];
                const isToday = i === todayIdx;
                return (
                  <div key={label} className="flex-1 text-center">
                    <p className={`text-xs mb-1 ${isToday ? 'font-bold text-gray-900' : 'text-gray-400'}`}>{label}</p>
                    <div
                      className={`mx-auto w-7 h-7 rounded-lg flex items-center justify-center ${
                        isActive
                          ? `${t.bg500} text-white`
                          : isToday
                            ? 'bg-gray-100 border-2 border-dashed border-gray-300'
                            : 'bg-gray-100'
                      }`}
                    >
                      {isActive && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {!stats.activeDays[todayIdx] && (
              <p className="text-xs text-gray-400 text-center mt-2">오늘도 학습해보세요!</p>
            )}
          </div>
        </div>
      )}

      {/* Learning Progress */}
      {!progressLoading && !dailyLoading && (studyInProgress.length > 0 || dailyInProgress.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-900">학습 진도</h2>
            <Link to="/profile" className={`text-xs ${t.text600} hover:underline`}>더보기</Link>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
            {studyInProgress.length > 0 && (
              <ProgressSection
                title="10단계 학습"
                color={t.bg500}
                badgeBg={t.bg50}
                badgeText={t.text700}
                items={studyInProgress.slice(0, 3).map((s) => {
                  const v = videoMap.get(s.videoId);
                  return {
                    videoId: s.videoId,
                    title: v?.title ?? s.videoId,
                    thumbnail: v?.thumbnail,
                    detail: `Step ${s.currentStep}/10`,
                    pct: s.currentStep * 10,
                    linkTo: `/study/${s.videoId}`,
                  };
                })}
              />
            )}
            {dailyInProgress.length > 0 && (
              <ProgressSection
                title="오늘의 학습"
                color="bg-emerald-500"
                badgeBg="bg-emerald-50"
                badgeText="text-emerald-700"
                items={dailyInProgress.slice(0, 3).map((p) => {
                  const v = videoMap.get(p.videoId);
                  const pct = p.totalSegments > 0 ? Math.round((p.nextSegmentIndex / p.totalSegments) * 100) : 0;
                  return {
                    videoId: p.videoId,
                    title: v?.title ?? p.videoId,
                    thumbnail: v?.thumbnail,
                    detail: `${pct}% (${p.nextSegmentIndex}/${p.totalSegments})`,
                    pct,
                    linkTo: '/daily',
                  };
                })}
              />
            )}
          </div>
        </div>
      )}

      {/* Completed Studies */}
      {!progressLoading && studyCompleted.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-2">완료한 학습</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
            {studyCompleted.slice(0, 5).map((s) => {
              const v = videoMap.get(s.videoId);
              return (
                <Link
                  key={s.videoId}
                  to={`/study/${s.videoId}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {v?.thumbnail && (
                    <img src={v.thumbnail} alt="" className="w-12 h-8 rounded object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{v?.title ?? s.videoId}</p>
                  </div>
                  <span className="text-xs font-medium text-emerald-600 flex-shrink-0">완료</span>
                </Link>
              );
            })}
            {studyCompleted.length > 5 && (
              <Link to="/profile" className={`block text-center text-xs ${t.text600} hover:underline pt-1`}>
                +{studyCompleted.length - 5}개 더보기
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );

  // --- Main content ---
  const mainContent = (
    <>
      {/* Continue Learning */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">이어서 하기</h2>
        {!progressLoading && !dailyLoading && continueItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {continueItems.map((item) => (
              <Link
                key={item.linkTo}
                to={item.linkTo}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md hover:border-gray-300 transition-all group"
              >
                {item.thumbnail && (
                  <img src={item.thumbnail} alt="" className="w-16 h-10 rounded object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                </div>
                <svg className={`w-5 h-5 ${t.text600} opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        ) : !progressLoading && !dailyLoading ? (
          <Link
            to="/daily"
            className={`block bg-white border-2 border-dashed ${t.border600} rounded-xl p-6 text-center hover:bg-gray-50 transition-colors`}
          >
            <p className={`text-sm font-medium ${t.text600}`}>새 영상으로 학습 시작하기</p>
            <p className="text-xs text-gray-400 mt-1">오늘의 학습에서 영상을 선택하세요</p>
          </Link>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <div className={`animate-spin w-6 h-6 border-3 ${t.border600} border-t-transparent rounded-full mx-auto`} />
          </div>
        )}
      </section>

      {/* Video Browse */}
      {videos.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">{langLabel} 영상 탐색</h2>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => { setSelectedCategory(null); setShowAll(false); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                  selectedCategory === null
                    ? `${t.bg600} text-white shadow-sm`
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                전체
                <span className={`text-xs ${selectedCategory === null ? 'text-white/70' : 'text-gray-400'}`}>{videos.length}</span>
              </button>
              {categories
                .sort((a, b) => a.order - b.order)
                .filter((cat) => countByCategory(cat.id) > 0)
                .map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(selectedCategory === cat.id ? null : cat.id); setShowAll(false); }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                      selectedCategory === cat.id
                        ? `${t.bg600} text-white shadow-sm`
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {cat.name}
                    <span className={`text-xs ${selectedCategory === cat.id ? 'text-white/70' : 'text-gray-400'}`}>{countByCategory(cat.id)}</span>
                  </button>
                ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(showAll ? filteredVideos : filteredVideos.slice(0, 6)).map((v) => (
              <div
                key={v.videoId}
                onClick={() => setSelectedVideo(v)}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="relative">
                  <img src={v.thumbnail} alt={v.title} className="w-full aspect-video object-cover" />
                  {isRecent(v) && (
                    <span className={`absolute top-2 left-2 ${t.bg600} text-white text-[10px] font-bold px-1.5 py-0.5 rounded`}>NEW</span>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="text-base font-semibold text-gray-900 line-clamp-2">{v.title}</h4>
                  {v.descriptionKo && (
                    <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{v.descriptionKo}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1.5">{v.channel}</p>
                </div>
              </div>
            ))}
          </div>
          {filteredVideos.length > 6 && (
            <div className="text-center mt-4">
              <button
                onClick={() => setShowAll((prev) => !prev)}
                className={`px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 ${t.hoverBorder300} ${t.hoverText600} transition-all`}
              >
                {showAll ? '접기' : `더보기 (${filteredVideos.length - 6}개)`}
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Desktop: 2-column layout */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_320px] lg:gap-8">
        <div className="space-y-6">
          {mainContent}
        </div>
        <aside className="space-y-5 sticky top-24 self-start">
          {sidebarContent}
        </aside>
      </div>

      {/* Mobile: single column */}
      <div className="lg:hidden space-y-6">
        {/* Compact header bar for mobile */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <Link to="/profile" className="flex items-center gap-3 flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className={`w-10 h-10 rounded-full ${t.bg100} flex items-center justify-center`}>
                <span className={`text-sm font-bold ${t.text600}`}>{profile.display_name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <span className="text-sm font-semibold text-gray-900">{profile.display_name}님</span>
          </Link>
          <div className="flex items-center gap-4 flex-1 sm:justify-end">
            {profile.current_streak_days > 0 && (
              <div className="flex items-center gap-1.5 text-orange-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 23a7.5 7.5 0 01-5.138-12.963C8.204 8.774 11.5 6.5 11 1.5c6 4 9 8 3 14 1 0 2.5 0 5-2.47.27.97.5 1.47.5 3.5A7.5 7.5 0 0112 23z" />
                </svg>
                <span className="text-sm font-bold">{profile.current_streak_days}일 연속</span>
              </div>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-sm font-bold ${t.text600}`}>Lv.{level}</span>
              <div className="w-20 bg-gray-100 rounded-full h-2">
                <div
                  className={`${t.bg500} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{currentXP}/{nextLevelXP}</span>
            </div>
          </div>
        </div>

        {mainContent}

        {/* Stats sections for mobile */}
        {!statsLoading && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">이번 주 통계</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="학습 영상" value={`${stats.videosStudied}개`} color={t.text600} />
              <StatCard label="총 학습시간" value={formatHours(stats.totalStudyTimeSec)} color="text-emerald-600" />
              <StatCard label="딕테이션" value={stats.dictationAccuracy > 0 ? `${stats.dictationAccuracy}%` : '-'} color="text-amber-600" />
              <StatCard label="오답 해결" value={`${stats.errorsResolved}개`} color="text-rose-600" />
            </div>
          </section>
        )}

        {!statsLoading && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">주간 활동</h2>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2">
                {DAY_LABELS.map((label, i) => {
                  const isActive = stats.activeDays[i];
                  const isToday = i === todayIdx;
                  return (
                    <div key={label} className="flex-1 text-center">
                      <p className={`text-xs mb-1.5 ${isToday ? 'font-bold text-gray-900' : 'text-gray-400'}`}>{label}</p>
                      <div
                        className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center ${
                          isActive
                            ? `${t.bg500} text-white`
                            : isToday
                              ? 'bg-gray-100 border-2 border-dashed border-gray-300'
                              : 'bg-gray-100'
                        }`}
                      >
                        {isActive && (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!stats.activeDays[todayIdx] && (
                <p className="text-xs text-gray-400 text-center mt-3">오늘도 학습해보세요!</p>
              )}
            </div>
          </section>
        )}

        {!progressLoading && !dailyLoading && (studyInProgress.length > 0 || dailyInProgress.length > 0) && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">학습 진도</h2>
              <Link to="/profile" className={`text-xs ${t.text600} hover:underline`}>더보기</Link>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
              {studyInProgress.length > 0 && (
                <ProgressSection
                  title="10단계 학습"
                  color={t.bg500}
                  badgeBg={t.bg50}
                  badgeText={t.text700}
                  items={studyInProgress.slice(0, 3).map((s) => {
                    const v = videoMap.get(s.videoId);
                    return {
                      videoId: s.videoId,
                      title: v?.title ?? s.videoId,
                      thumbnail: v?.thumbnail,
                      detail: `Step ${s.currentStep}/10`,
                      pct: s.currentStep * 10,
                      linkTo: `/study/${s.videoId}`,
                    };
                  })}
                />
              )}
              {dailyInProgress.length > 0 && (
                <ProgressSection
                  title="오늘의 학습"
                  color="bg-emerald-500"
                  badgeBg="bg-emerald-50"
                  badgeText="text-emerald-700"
                  items={dailyInProgress.slice(0, 3).map((p) => {
                    const v = videoMap.get(p.videoId);
                    const pct = p.totalSegments > 0 ? Math.round((p.nextSegmentIndex / p.totalSegments) * 100) : 0;
                    return {
                      videoId: p.videoId,
                      title: v?.title ?? p.videoId,
                      thumbnail: v?.thumbnail,
                      detail: `${pct}% (${p.nextSegmentIndex}/${p.totalSegments})`,
                      pct,
                      linkTo: '/daily',
                    };
                  })}
                />
              )}
            </div>
          </section>
        )}

        {/* Completed Studies for mobile */}
        {!progressLoading && studyCompleted.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">완료한 학습</h2>
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              {studyCompleted.slice(0, 5).map((s) => {
                const v = videoMap.get(s.videoId);
                return (
                  <Link
                    key={s.videoId}
                    to={`/study/${s.videoId}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {v?.thumbnail && (
                      <img src={v.thumbnail} alt="" className="w-14 h-9 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{v?.title ?? s.videoId}</p>
                    </div>
                    <span className="text-xs font-medium text-emerald-600 flex-shrink-0">완료</span>
                  </Link>
                );
              })}
              {studyCompleted.length > 5 && (
                <Link to="/profile" className={`block text-center text-xs ${t.text600} hover:underline pt-1`}>
                  +{studyCompleted.length - 5}개 더보기
                </Link>
              )}
            </div>
          </section>
        )}
      </div>

      <VideoModeModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </div>
  );
}

// --- Helper components ---

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

interface ProgressItemData {
  videoId: string;
  title: string;
  thumbnail?: string;
  detail: string;
  pct: number;
  linkTo: string;
}

function ProgressSection({
  title,
  color,
  badgeBg,
  badgeText,
  items,
}: {
  title: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  items: ProgressItemData[];
}) {
  return (
    <div>
      <h3 className={`text-xs font-semibold ${badgeText} ${badgeBg} inline-block px-2 py-0.5 rounded-full mb-2`}>
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item) => (
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
                  <div className={`h-1 rounded-full ${color}`} style={{ width: `${item.pct}%` }} />
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-gray-500 flex-shrink-0">{item.detail}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function getLevel(xp: number): { level: number; currentXP: number; nextLevelXP: number } {
  let level = 1;
  let remaining = xp;
  while (remaining >= level * 100) {
    remaining -= level * 100;
    level++;
  }
  return { level, currentXP: remaining, nextLevelXP: level * 100 };
}
