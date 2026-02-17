import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import {
  syncErrorNoteToCloud,
  pullErrorNotesFromCloud,
  updateErrorNoteInCloud,
  deleteErrorNoteFromCloud,
} from '../lib/supabaseSync';
import { AuthContext } from '../contexts/AuthContext';
import { XPToastContext } from '../contexts/XPToastContext';
import { supabase } from '../lib/supabase';
import { XP_RULES } from './useRewards';
import type { ErrorNote } from '../types';

export function useErrorNotes(videoId?: string) {
  const [notes, setNotes] = useState<ErrorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
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

      // Award XP when resolving an error note
      if (isResolved && supabase) {
        try {
          const xp = XP_RULES.error_note_resolved;
          await supabase.rpc('increment_xp', { user_id_input: uid, amount: xp });
          xpToast?.showXPToast(xp, '오답노트 해결');
          supabase.from('xp_events').insert({
            user_id: uid, event_type: 'error_note_resolved',
            xp_amount: xp, metadata: { noteId: id },
          });
          auth?.refreshProfile();
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
