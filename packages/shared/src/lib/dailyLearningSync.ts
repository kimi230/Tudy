import { supabase } from './supabase';
import { requireSupabase, getDefaultLanguage } from './supabaseSync';

// --- Daily Learning Progress ---

export interface DailyLearningProgress {
  id?: number;
  videoId: string;
  nextSegmentIndex: number;
  totalSegments: number;
  isActive: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface SupabaseDailyProgress {
  id?: number;
  user_id: string;
  video_id: string;
  next_segment_index: number;
  total_segments: number;
  is_active: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function fromSupabase(row: SupabaseDailyProgress): DailyLearningProgress {
  return {
    id: row.id,
    videoId: row.video_id,
    nextSegmentIndex: row.next_segment_index,
    totalSegments: row.total_segments,
    isActive: row.is_active,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Get all daily learning progress entries for a user */
export async function getAllDailyProgress(userId: string): Promise<DailyLearningProgress[]> {
  const sb = requireSupabase();
  const { data } = await sb
    .from('daily_learning_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('language', getDefaultLanguage())
    .order('updated_at', { ascending: false });
  return (data ?? []).map(fromSupabase);
}

/** Get the currently active daily learning video */
export async function getActiveDailyVideo(userId: string): Promise<DailyLearningProgress | null> {
  const sb = requireSupabase();
  const { data } = await sb
    .from('daily_learning_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('language', getDefaultLanguage())
    .eq('is_active', true)
    .limit(1)
    .single();
  return data ? fromSupabase(data) : null;
}

/** Set a video as the active daily learning video (deactivates others) */
export async function setActiveDailyVideo(
  userId: string,
  videoId: string,
  totalSegments: number
): Promise<void> {
  const sb = requireSupabase();

  const lang = getDefaultLanguage();

  // Deactivate all current active videos
  await sb
    .from('daily_learning_progress')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('language', lang)
    .eq('is_active', true);

  // Upsert the selected video as active
  await sb.from('daily_learning_progress').upsert(
    {
      user_id: userId,
      video_id: videoId,
      language: lang,
      is_active: true,
      total_segments: totalSegments,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,video_id,language' }
  );
}

/** Update progress after completing a daily session */
export async function updateDailyProgress(
  userId: string,
  videoId: string,
  nextSegmentIndex: number,
  totalSegments: number
): Promise<void> {
  const sb = requireSupabase();
  const isCompleted = nextSegmentIndex >= totalSegments;
  const lang = getDefaultLanguage();

  await sb
    .from('daily_learning_progress')
    .update({
      next_segment_index: nextSegmentIndex,
      completed_at: isCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('video_id', videoId)
    .eq('language', lang);
}
