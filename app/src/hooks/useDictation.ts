import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  saveDictationAttempt,
  getDictationAttemptsByVideo,
  deleteDictationAttempt,
} from '../lib/db';
import type { DictationAttempt, DictationWordResult } from '../types';

export interface SegmentStat {
  bestScore: number;
  totalAttempts: number;
}

export function useDictation(videoId: string) {
  const [attempts, setAttempts] = useState<DictationAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getDictationAttemptsByVideo(videoId);
    setAttempts(data);
    setLoading(false);
  }, [videoId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getDictationAttemptsByVideo(videoId);
      if (!cancelled) {
        setAttempts(data);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [videoId]);

  const addAttempt = useCallback(
    async (params: {
      segmentIndex: number;
      userInput: string;
      correctText: string;
      wordResults: DictationWordResult[];
      score: number;
    }) => {
      await saveDictationAttempt({
        videoId,
        ...params,
        createdAt: new Date().toISOString(),
      });
      await reload();
    },
    [videoId, reload]
  );

  const removeAttempt = useCallback(
    async (id: number) => {
      await deleteDictationAttempt(id);
      await reload();
    },
    [reload]
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
