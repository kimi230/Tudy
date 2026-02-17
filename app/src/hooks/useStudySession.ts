import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { saveSession, getSessionsByVideo } from '../lib/db';
import { syncSessionToCloud, pullSessionsFromCloud } from '../lib/supabaseSync';
import { AuthContext } from '../contexts/AuthContext';
import { XPToastContext } from '../contexts/XPToastContext';
import { supabase } from '../lib/supabase';
import { XP_RULES } from './useRewards';
import type { StudySession, MarkedSegment, CornellNotes } from '../types';

function createNewSession(videoId: string): StudySession {
  const now = new Date().toISOString();
  return {
    id: `${videoId}_${Date.now()}`,
    videoId,
    currentStep: 1,
    stepStatus: {
      1: 'in_progress',
      2: 'pending',
      3: 'pending',
      4: 'pending',
      5: 'pending',
      6: 'pending',
      7: 'pending',
      8: 'pending',
      9: 'pending',
      10: 'pending',
    },
    cornellNotes: { cues: '', notes: '', summary: '' },
    markedSegments: [],
    reviewNeeded: [],
    selfScore: 0,
    summary: '',
    totalStudyTimeSec: 0,
    startedAt: now,
  };
}

function mergeSessions(local: StudySession[], cloud: StudySession[]): StudySession[] {
  const map = new Map<string, StudySession>();
  for (const s of local) map.set(s.id, s);
  for (const s of cloud) {
    const existing = map.get(s.id);
    if (!existing || s.totalStudyTimeSec > existing.totalStudyTimeSec) {
      map.set(s.id, s);
    }
  }
  return Array.from(map.values());
}

export function useStudySession(videoId: string) {
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id;
  const xpToast = useContext(XPToastContext);

  // Load or create session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let sessions = await getSessionsByVideo(videoId);

      // If logged in, merge with cloud data
      if (userId) {
        try {
          const cloudSessions = await pullSessionsFromCloud(videoId, userId);
          sessions = mergeSessions(sessions, cloudSessions);
          // Save merged results locally
          for (const s of sessions) await saveSession(s);
        } catch {
          // Offline — use local only
        }
      }

      const incomplete = sessions
        .filter((s) => !s.completedAt)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

      if (!cancelled) {
        if (incomplete.length > 0) {
          setSession(incomplete[0]);
        } else {
          const newSession = createNewSession(videoId);
          await saveSession(newSession);
          if (userId) syncSessionToCloud(newSession, userId).catch(() => {});
          setSession(newSession);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [videoId, userId]);

  // Auto-save timer (every 30s)
  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      setSession((prev) => {
        if (!prev) return prev;
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const updated = { ...prev, totalStudyTimeSec: prev.totalStudyTimeSec + elapsed };
        startTimeRef.current = Date.now();
        saveSession(updated);
        if (userId) syncSessionToCloud(updated, userId).catch(() => {});
        return updated;
      });
    }, 30000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [userId]);

  const persist = useCallback(async (updated: StudySession) => {
    setSession(updated);
    await saveSession(updated);
    if (userId) syncSessionToCloud(updated, userId).catch(() => {});
  }, [userId]);

  const goToStep = useCallback(
    (step: number) => {
      if (!session) return;
      const updated = {
        ...session,
        currentStep: step,
        stepStatus: {
          ...session.stepStatus,
          [step]: session.stepStatus[step] === 'completed' ? 'completed' as const : 'in_progress' as const,
        },
      };
      persist(updated);
    },
    [session, persist]
  );

  const completeStep = useCallback(
    (step: number) => {
      if (!session) return;
      const nextStep = step < 10 ? step + 1 : step;
      const isSessionComplete = step === 10;
      const updated = {
        ...session,
        currentStep: nextStep,
        stepStatus: {
          ...session.stepStatus,
          [step]: 'completed' as const,
          ...(nextStep !== step ? { [nextStep]: 'in_progress' as const } : {}),
        },
        ...(isSessionComplete ? { completedAt: new Date().toISOString() } : {}),
      };
      persist(updated);

      // Award XP if logged in
      if (userId && supabase) {
        (async () => {
          try {
            await supabase.rpc('increment_xp', { user_id_input: userId, amount: XP_RULES.step_complete });
            xpToast?.showXPToast(XP_RULES.step_complete, '학습 스텝 완료');
            supabase.from('xp_events').insert({
              user_id: userId, event_type: 'step_complete',
              xp_amount: XP_RULES.step_complete, metadata: { step, videoId },
            });
            if (isSessionComplete) {
              await supabase.rpc('increment_xp', { user_id_input: userId, amount: XP_RULES.session_complete });
              xpToast?.showXPToast(XP_RULES.session_complete, '학습 세션 완료 보너스!');
              supabase.from('xp_events').insert({
                user_id: userId, event_type: 'session_complete',
                xp_amount: XP_RULES.session_complete, metadata: { videoId },
              });
              supabase.rpc('update_streak', { user_id_input: userId });
              supabase.rpc('check_and_award_badges', { user_id_input: userId });
            }
            auth?.refreshProfile();
          } catch { /* offline */ }
        })();
      }
    },
    [session, persist, userId, xpToast, auth, videoId]
  );

  const updateNotes = useCallback(
    (notes: string | CornellNotes) => {
      if (!session) return;
      persist({ ...session, cornellNotes: notes });
    },
    [session, persist]
  );

  const updateMarkedSegments = useCallback(
    (segments: MarkedSegment[]) => {
      if (!session) return;
      persist({ ...session, markedSegments: segments });
    },
    [session, persist]
  );

  const updateReviewNeeded = useCallback(
    (indices: number[]) => {
      if (!session) return;
      persist({ ...session, reviewNeeded: indices });
    },
    [session, persist]
  );

  const updateSelfScore = useCallback(
    (score: number) => {
      if (!session) return;
      persist({ ...session, selfScore: score });
    },
    [session, persist]
  );

  const updateSummary = useCallback(
    (summary: string) => {
      if (!session) return;
      persist({ ...session, summary });
    },
    [session, persist]
  );

  return {
    session,
    loading,
    goToStep,
    completeStep,
    updateNotes,
    updateMarkedSegments,
    updateReviewNeeded,
    updateSelfScore,
    updateSummary,
  };
}
