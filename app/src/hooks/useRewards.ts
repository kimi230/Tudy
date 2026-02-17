import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { awardXP as awardXPService } from '../lib/xpService';
import { useAuth } from './useAuth';

export interface XPEvent {
  id: number;
  event_type: string;
  xp_amount: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name_ko: string;
  description_ko: string;
  icon: string;
  xp_reward: number;
}

export interface UserBadge extends Badge {
  earned_at: string;
}

// XP reward rules
export const XP_RULES = {
  step_complete: 10,
  session_complete: 50,
  dictation_attempt: 5,
  dictation_perfect: 20,
  error_note_resolved: 5,
  daily_streak: 10,
  daily_session_base: 10,
  daily_session_bonus_max: 40,
} as const;

export function calcDailySessionXP(avgScore: number): number {
  const bonus = Math.round((avgScore / 100) * XP_RULES.daily_session_bonus_max);
  return XP_RULES.daily_session_base + bonus;
}

export function useRewards() {
  const auth = useAuth();
  const userId = auth.user?.id;
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [recentXP, setRecentXP] = useState<XPEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBadges = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data } = await supabase
      .from('user_badges')
      .select('badge_id, earned_at, badge_definitions(*)')
      .eq('user_id', userId);

    if (data) {
      setBadges(
        data.map((row) => {
          const def = row.badge_definitions as unknown as Badge;
          return { ...def, earned_at: row.earned_at };
        })
      );
    }
  }, [userId]);

  const loadRecentXP = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data } = await supabase
      .from('xp_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setRecentXP(data as XPEvent[]);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    Promise.all([loadBadges(), loadRecentXP()]).then(() => setLoading(false));
  }, [userId, loadBadges, loadRecentXP]);

  const awardXP = useCallback(
    async (
      eventType: string,
      xpAmount: number,
      metadata?: Record<string, unknown>
    ): Promise<number | null> => {
      if (!userId) return null;
      const ok = await awardXPService(userId, eventType, xpAmount, metadata);
      if (!ok) return null;
      auth.refreshProfile();
      return xpAmount;
    },
    [userId, auth]
  );

  return {
    badges,
    recentXP,
    loading,
    awardXP,
    refreshBadges: loadBadges,
    refreshXP: loadRecentXP,
  };
}
