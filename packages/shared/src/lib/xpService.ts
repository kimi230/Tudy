import { supabase } from './supabase';

/**
 * Standalone XP awarding function.
 * Single RPC call: award_xp_complete handles insert, increment, streak, badges atomically.
 * Returns xpAmount on success, null on failure or duplicate.
 */
export async function awardXP(
  userId: string,
  eventType: string,
  xpAmount: number,
  metadata?: Record<string, unknown>,
  dedupKey?: string
): Promise<number | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('award_xp_complete', {
      user_id_input: userId,
      event_type_input: eventType,
      xp_amount_input: xpAmount,
      metadata_input: metadata ?? null,
      dedup_key_input: dedupKey ?? null,
    });
    if (error) return null;
    const result = data as { success: boolean; reason?: string };
    if (!result?.success) return null;
    return xpAmount;
  } catch {
    return null;
  }
}
