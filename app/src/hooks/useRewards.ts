import { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../contexts/AuthContext';

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
} as const;

export function useRewards() {
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id;
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
      if (!supabase || !userId) return null;

      // Insert XP event
      const { error } = await supabase.from('xp_events').insert({
        user_id: userId,
        event_type: eventType,
        xp_amount: xpAmount,
        metadata: metadata ?? null,
      });
      if (error) return null;

      // Update total_xp in profiles
      await supabase.rpc('increment_xp', { user_id_input: userId, amount: xpAmount });

      // Update streak
      await supabase.rpc('update_streak', { user_id_input: userId });

      // Check badges
      await supabase.rpc('check_and_award_badges', { user_id_input: userId });

      // Refresh profile
      auth?.refreshProfile();

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
