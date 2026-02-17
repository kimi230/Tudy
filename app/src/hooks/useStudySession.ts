import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { syncSessionToCloud, pullSessionsFromCloud } from '../lib/supabaseSync';
import { awardXP } from '../lib/xpService';
import { useAuth } from './useAuth';
import { XPToastContext } from '../contexts/XPToastContext';
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

export function useStudySession(videoId: string) {
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const auth = useAuth();
  const userId = auth.user?.id;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const xpToast = useContext(XPToastContext);

  // Load or create session
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const sessions = await pullSessionsFromCloud(videoId, userId);

        const incomplete = sessions
          .filter((s) => !s.completedAt)
          .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

        if (!cancelled) {
          if (incomplete.length > 0) {
            setSession(incomplete[0]);
          } else {
            const newSession = createNewSession(videoId);
            await syncSessionToCloud(newSession, userId);
            setSession(newSession);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
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
        const uid = userIdRef.current;
        if (uid) syncSessionToCloud(updated, uid).catch(() => {});
        return updated;
      });
    }, 30000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const persist = useCallback(async (updated: StudySession) => {
    setSession(updated);
    const uid = userIdRef.current;
    if (uid) syncSessionToCloud(updated, uid).catch(() => {});
  }, []);

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

      // Award XP
      const uid = userIdRef.current;
      if (uid) {
        (async () => {
          try {
            await awardXP(uid, 'step_complete', XP_RULES.step_complete, { step, videoId });
            xpToast?.showXPToast(XP_RULES.step_complete, '학습 스텝 완료');
            if (isSessionComplete) {
              await awardXP(uid, 'session_complete', XP_RULES.session_complete, { videoId });
              xpToast?.showXPToast(XP_RULES.session_complete, '학습 세션 완료 보너스!');
            }
            auth.refreshProfile();
          } catch { /* offline */ }
        })();
      }
    },
    [session, persist, xpToast, auth, videoId]
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
