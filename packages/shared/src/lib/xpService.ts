import { supabase } from './supabase';

/**
 * Standalone XP awarding function.
 * Handles: xp_events insert, increment_xp, update_streak, check_and_award_badges.
 * Callers are responsible for toast display and profile refresh.
 */
export async function awardXP(
  userId: string,
  eventType: string,
  xpAmount: number,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('xp_events').insert({
      user_id: userId,
      event_type: eventType,
      xp_amount: xpAmount,
      metadata: metadata ?? null,
    });
    if (error) return false;
    await supabase.rpc('increment_xp', { user_id_input: userId, amount: xpAmount });
    await supabase.rpc('update_streak', { user_id_input: userId });
    await supabase.rpc('check_and_award_badges', { user_id_input: userId });
    return true;
  } catch {
    return false;
  }
}
