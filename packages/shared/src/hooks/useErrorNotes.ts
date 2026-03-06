import { useState, useEffect, useCallback, useContext } from 'react';
import {
  syncErrorNoteToCloud,
  pullErrorNotesFromCloud,
  updateErrorNoteInCloud,
  deleteErrorNoteFromCloud,
} from '../lib/supabaseSync';
import { awardXP } from '../lib/xpService';
import { useUserIdRef } from './useUserIdRef';
import { XPToastContext } from '../contexts/XPToastContext';
import { XP_RULES } from './useRewards';
import type { ErrorNote } from '../types';

export function useErrorNotes(videoId?: string) {
  const [notes, setNotes] = useState<ErrorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const { auth, userId, userIdRef } = useUserIdRef();
  const xpToast = useContext(XPToastContext);

  const reload = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) { setLoading(false); return; }
    try {
      const data = await pullErrorNotesFromCloud(videoId, uid);
      setNotes(data);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (userId) reload();
  }, [userId, reload]);

  const addNote = useCallback(
    async (note: Omit<ErrorNote, 'id' | 'createdAt'>) => {
      const uid = userIdRef.current;
      if (!uid) return;
      const fullNote: ErrorNote = { ...note, createdAt: new Date().toISOString() };
      await syncErrorNoteToCloud(fullNote, uid);
      await reload();
    },
    [reload]
  );

  const toggleResolved = useCallback(
    async (id: number, isResolved: boolean) => {
      const uid = userIdRef.current;
      if (!uid) return;
      await updateErrorNoteInCloud(id, { is_resolved: isResolved }, uid);

      // Award XP when resolving an error note (dedup prevents farming via toggle)
      if (isResolved) {
        try {
          const awarded = await awardXP(uid, 'error_note_resolved', XP_RULES.error_note_resolved, { noteId: id }, `error_resolved_${id}`);
          if (awarded) xpToast?.showXPToast(awarded, '오답노트 해결');
          auth.refreshProfile();
        } catch { /* offline */ }
      }

      await reload();
    },
    [reload, xpToast, auth]
  );

  const removeNote = useCallback(
    async (id: number) => {
      const uid = userIdRef.current;
      if (!uid) return;
      await deleteErrorNoteFromCloud(id, uid);
      await reload();
    },
    [reload]
  );

  return { notes, loading, addNote, toggleResolved, removeNote };
}
