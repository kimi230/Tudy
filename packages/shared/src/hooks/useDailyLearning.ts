import { useState, useEffect, useCallback } from 'react';
import { useUserIdRef } from './useUserIdRef';
import {
  getAllDailyProgress,
  getActiveDailyVideo,
  setActiveDailyVideo,
  updateDailyProgress,
  type DailyLearningProgress,
} from '../lib/dailyLearningSync';

export function useDailyLearning() {
  const [activeVideo, setActiveVideo] = useState<DailyLearningProgress | null>(null);
  const [allProgress, setAllProgress] = useState<DailyLearningProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId, userIdRef } = useUserIdRef();

  const reload = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) { setLoading(false); return; }
    try {
      const [active, all] = await Promise.all([
        getActiveDailyVideo(uid),
        getAllDailyProgress(uid),
      ]);
      setActiveVideo(active);
      setAllProgress(all);
    } catch {
      // offline or not configured
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Re-sync when user logs in
  useEffect(() => {
    if (userId) reload();
  }, [userId, reload]);

  const selectVideo = useCallback(async (videoId: string, totalSegments: number) => {
    const uid = userIdRef.current;
    if (!uid) return;
    await setActiveDailyVideo(uid, videoId, totalSegments);
    await reload();
  }, [reload]);

  const completeSession = useCallback(async (
    videoId: string,
    nextSegmentIndex: number,
    totalSegments: number
  ) => {
    const uid = userIdRef.current;
    if (!uid) return;
    await updateDailyProgress(uid, videoId, nextSegmentIndex, totalSegments);
    await reload();
  }, [reload]);

  return {
    activeVideo,
    allProgress,
    loading,
    selectVideo,
    completeSession,
    reload,
  };
}
