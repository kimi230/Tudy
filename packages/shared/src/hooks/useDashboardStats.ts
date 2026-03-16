import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface WeeklyStats {
  videosStudied: number;
  totalStudyTimeSec: number;
  dictationAccuracy: number;
  errorsResolved: number;
  activeDays: boolean[]; // [월,화,수,목,금,토,일]
}

const EMPTY_STATS: WeeklyStats = {
  videosStudied: 0,
  totalStudyTimeSec: 0,
  dictationAccuracy: 0,
  errorsResolved: 0,
  activeDays: [false, false, false, false, false, false, false],
};

function getMonday(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? 6 : day - 1; // Monday offset
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<WeeklyStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user?.id) {
      setLoading(false);
      return;
    }

    const uid = user.id;
    const mondayISO = getMonday();

    Promise.all([
      // XP events this week → active days + video count
      supabase
        .from('xp_events')
        .select('created_at, metadata')
        .eq('user_id', uid)
        .gte('created_at', mondayISO),

      // Study sessions this week → study time
      supabase
        .from('study_sessions')
        .select('video_id, total_study_time_sec, started_at')
        .eq('user_id', uid)
        .gte('started_at', mondayISO),

      // Dictation attempts this week → accuracy
      supabase
        .from('dictation_attempts')
        .select('score')
        .eq('user_id', uid)
        .gte('created_at', mondayISO),

      // Resolved error notes this week
      supabase
        .from('error_notes')
        .select('id')
        .eq('user_id', uid)
        .eq('is_resolved', true)
        .gte('updated_at', mondayISO),
    ])
      .then(([xpResult, sessionResult, dictResult, errorResult]) => {
        // Active days from xp_events
        const activeDays: boolean[] = [false, false, false, false, false, false, false];
        const videoIds = new Set<string>();

        if (xpResult.data) {
          for (const row of xpResult.data) {
            const d = new Date(row.created_at);
            const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon=0..Sun=6
            activeDays[dayIdx] = true;
            // Extract videoId from metadata if available
            const meta = row.metadata as Record<string, unknown> | null;
            if (meta?.videoId) videoIds.add(meta.videoId as string);
          }
        }

        // Study time from sessions
        let totalTime = 0;
        if (sessionResult.data) {
          for (const row of sessionResult.data) {
            totalTime += (row.total_study_time_sec ?? 0);
            videoIds.add(row.video_id);
          }
        }

        // Dictation accuracy
        let dictAccuracy = 0;
        if (dictResult.data && dictResult.data.length > 0) {
          const sum = dictResult.data.reduce((acc: number, r: { score: number }) => acc + r.score, 0);
          dictAccuracy = Math.round(sum / dictResult.data.length);
        }

        // Resolved errors
        const errorsResolved = errorResult.data?.length ?? 0;

        setStats({
          videosStudied: videoIds.size,
          totalStudyTimeSec: totalTime,
          dictationAccuracy: dictAccuracy,
          errorsResolved,
          activeDays,
        });
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  return { stats, loading };
}
