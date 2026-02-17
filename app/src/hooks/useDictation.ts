import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import {
  saveDictationAttempt,
  getDictationAttemptsByVideo,
  deleteDictationAttempt,
} from '../lib/db';
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
  const xpToast = useContext(XPToastContext);

  const reload = useCallback(async () => {
    let data = await getDictationAttemptsByVideo(videoId);

    // Merge cloud data if logged in
    if (userId) {
      try {
        const cloudData = await pullDictationFromCloud(videoId, userId);
        // Merge: cloud items not in local by createdAt+segmentIndex
        const localKeys = new Set(data.map((d) => `${d.segmentIndex}_${d.createdAt}`));
        for (const c of cloudData) {
          if (!localKeys.has(`${c.segmentIndex}_${c.createdAt}`)) {
            data.push(c);
          }
        }
      } catch {
        // Offline
      }
    }

    setAttempts(data);
    setLoading(false);
  }, [videoId, userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await reload();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [reload]);

  const addAttempt = useCallback(
    async (params: {
      segmentIndex: number;
      userInput: string;
      correctText: string;
      wordResults: DictationWordResult[];
      score: number;
    }) => {
      const attempt: DictationAttempt = {
        videoId,
        ...params,
        createdAt: new Date().toISOString(),
      };
      await saveDictationAttempt(attempt);
      if (userId) syncDictationToCloud(attempt, userId).catch(() => {});

      // Award XP if logged in
      if (userId && supabase) {
        (async () => {
          try {
            const xp = XP_RULES.dictation_attempt;
            await supabase.rpc('increment_xp', { user_id_input: userId, amount: xp });
            xpToast?.showXPToast(xp, '딕테이션 시도');
            supabase.from('xp_events').insert({
              user_id: userId, event_type: 'dictation_attempt',
              xp_amount: xp, metadata: { videoId, segmentIndex: params.segmentIndex },
            });
            if (params.score === 100) {
              const bonus = XP_RULES.dictation_perfect;
              await supabase.rpc('increment_xp', { user_id_input: userId, amount: bonus });
              xpToast?.showXPToast(bonus, '딕테이션 만점 보너스!');
              supabase.from('xp_events').insert({
                user_id: userId, event_type: 'dictation_perfect',
                xp_amount: bonus, metadata: { videoId, segmentIndex: params.segmentIndex },
              });
            }
            supabase.rpc('update_streak', { user_id_input: userId });
            supabase.rpc('check_and_award_badges', { user_id_input: userId });
            auth?.refreshProfile();
          } catch { /* offline */ }
        })();
      }

      await reload();
    },
    [videoId, userId, reload, xpToast, auth]
  );

  const removeAttempt = useCallback(
    async (id: number) => {
      await deleteDictationAttempt(id);
      if (userId) deleteDictationFromCloud(id, userId).catch(() => {});
      await reload();
    },
    [userId, reload]
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
