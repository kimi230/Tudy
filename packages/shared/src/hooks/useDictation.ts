import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { syncDictationToCloud, pullDictationFromCloud, deleteDictationFromCloud } from '../lib/supabaseSync';
import { awardXP } from '../lib/xpService';
import { useUserIdRef } from './useUserIdRef';
import { XPToastContext } from '../contexts/XPToastContext';
import { XP_RULES } from './useRewards';
import type { DictationAttempt, DictationWordResult } from '../types';

export interface SegmentStat {
  bestScore: number;
  totalAttempts: number;
}

export function useDictation(videoId: string) {
  const [attempts, setAttempts] = useState<DictationAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const { auth, userId, userIdRef } = useUserIdRef();
  const xpToast = useContext(XPToastContext);

  const reload = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) { setLoading(false); return; }
    try {
      const data = await pullDictationFromCloud(videoId, uid);
      setAttempts(data);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Re-sync when user logs in
  useEffect(() => {
    if (userId) reload();
  }, [userId, reload]);

  const addAttempt = useCallback(
    async (params: {
      segmentIndex: number;
      userInput: string;
      correctText: string;
      wordResults: DictationWordResult[];
      score: number;
    }) => {
      const uid = userIdRef.current;
      if (!uid) return;

      const attempt: DictationAttempt = {
        videoId,
        ...params,
        createdAt: new Date().toISOString(),
      };
      await syncDictationToCloud(attempt, uid);

      // Award XP
      try {
        const attemptAwarded = await awardXP(uid, 'dictation_attempt', XP_RULES.dictation_attempt, { videoId, segmentIndex: params.segmentIndex });
        if (attemptAwarded) xpToast?.showXPToast(attemptAwarded, '딕테이션 시도');
        if (params.score === 100) {
          const perfectAwarded = await awardXP(uid, 'dictation_perfect', XP_RULES.dictation_perfect, { videoId, segmentIndex: params.segmentIndex });
          if (perfectAwarded) xpToast?.showXPToast(perfectAwarded, '딕테이션 만점 보너스!');
        }
        auth.refreshProfile();
      } catch { /* offline */ }

      await reload();
    },
    [videoId, reload, xpToast, auth]
  );

  const removeAttempt = useCallback(
    async (id: number) => {
      const uid = userIdRef.current;
      if (!uid) return;
      await deleteDictationFromCloud(id, uid);
      await reload();
    },
    [reload]
  );

  const segmentStats = useMemo(() => {
    const map = new Map<number, SegmentStat>();
    for (const a of attempts) {
      const existing = map.get(a.segmentIndex);
      if (existing) {
        existing.bestScore = Math.max(existing.bestScore, a.score);
        existing.totalAttempts++;
      } else {
        map.set(a.segmentIndex, { bestScore: a.score, totalAttempts: 1 });
      }
    }
    return map;
  }, [attempts]);

  return { attempts, loading, addAttempt, removeAttempt, segmentStats };
}
