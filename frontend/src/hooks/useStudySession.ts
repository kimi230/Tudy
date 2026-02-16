import { useState, useEffect, useCallback, useRef } from 'react';
import { saveSession, getSessionsByVideo } from '../lib/db';
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
  const startTimeRef = useRef<number>(Date.now());

  // Load or create session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sessions = await getSessionsByVideo(videoId);
      // Resume the latest incomplete session, or create new
      const incomplete = sessions
        .filter((s) => !s.completedAt)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

      if (!cancelled) {
        if (incomplete.length > 0) {
          setSession(incomplete[0]);
        } else {
          const newSession = createNewSession(videoId);
          await saveSession(newSession);
          setSession(newSession);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [videoId]);

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
        return updated;
      });
    }, 30000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const persist = useCallback(async (updated: StudySession) => {
    setSession(updated);
    await saveSession(updated);
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
      const updated = {
        ...session,
        currentStep: nextStep,
        stepStatus: {
          ...session.stepStatus,
          [step]: 'completed' as const,
          ...(nextStep !== step ? { [nextStep]: 'in_progress' as const } : {}),
        },
        ...(step === 10 ? { completedAt: new Date().toISOString() } : {}),
      };
      persist(updated);
    },
    [session, persist]
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
