import { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { syncDictationToCloud, pullDictationFromCloud, deleteDictationFromCloud } from '../lib/supabaseSync';
import { AuthContext } from '../contexts/AuthContext';
import { XPToastContext } from '../contexts/XPToastContext';
import { supabase } from '../lib/supabase';
import { XP_RULES } from './useRewards';
import type { DictationAttempt, DictationWordResult } from '../types';

export interface SegmentStat {
  bestScore: number;
  totalAttempts: number;
}

export function useDictation(videoId: string) {
  const [attempts, setAttempts] = useState<DictationAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
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
      if (supabase) {
        try {
          const xp = XP_RULES.dictation_attempt;
          await supabase.rpc('increment_xp', { user_id_input: uid, amount: xp });
          xpToast?.showXPToast(xp, '딕테이션 시도');
          supabase.from('xp_events').insert({
            user_id: uid, event_type: 'dictation_attempt',
            xp_amount: xp, metadata: { videoId, segmentIndex: params.segmentIndex },
          });
          if (params.score === 100) {
            const bonus = XP_RULES.dictation_perfect;
            await supabase.rpc('increment_xp', { user_id_input: uid, amount: bonus });
            xpToast?.showXPToast(bonus, '딕테이션 만점 보너스!');
            supabase.from('xp_events').insert({
              user_id: uid, event_type: 'dictation_perfect',
              xp_amount: bonus, metadata: { videoId, segmentIndex: params.segmentIndex },
            });
          }
          supabase.rpc('update_streak', { user_id_input: uid });
          supabase.rpc('check_and_award_badges', { user_id_input: uid });
          auth?.refreshProfile();
        } catch { /* offline */ }
      }

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
