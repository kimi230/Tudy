import { useState, useEffect, useCallback, useContext } from 'react';
import {
  saveErrorNote,
  getErrorNotesByVideo,
  getAllErrorNotes,
  updateErrorNote,
  deleteErrorNote,
} from '../lib/db';
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
  const xpToast = useContext(XPToastContext);

  const reload = useCallback(async () => {
    let data = videoId
      ? await getErrorNotesByVideo(videoId)
      : await getAllErrorNotes();

    // Merge cloud data if logged in
    if (userId) {
      try {
        const cloudData = await pullErrorNotesFromCloud(videoId, userId);
        const localKeys = new Set(
          data.map((n) => `${n.videoId}_${n.segmentIndex}_${n.createdAt}`)
        );
        for (const c of cloudData) {
          if (!localKeys.has(`${c.videoId}_${c.segmentIndex}_${c.createdAt}`)) {
            data.push(c);
          }
        }
      } catch {
        // Offline
      }
    }

    setNotes(data);
    setLoading(false);
  }, [videoId, userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await reload();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [reload]);

  const addNote = useCallback(
    async (note: Omit<ErrorNote, 'id' | 'createdAt'>) => {
      const fullNote: ErrorNote = { ...note, createdAt: new Date().toISOString() };
      await saveErrorNote(fullNote);
      if (userId) syncErrorNoteToCloud(fullNote, userId).catch(() => {});
      await reload();
    },
    [userId, reload]
  );

  const toggleResolved = useCallback(
    async (id: number, isResolved: boolean) => {
      await updateErrorNote(id, { isResolved });
      if (userId) updateErrorNoteInCloud(id, { is_resolved: isResolved }, userId).catch(() => {});

      // Award XP when resolving an error note
      if (isResolved && userId && supabase) {
        (async () => {
          try {
            const xp = XP_RULES.error_note_resolved;
            await supabase.rpc('increment_xp', { user_id_input: userId, amount: xp });
            xpToast?.showXPToast(xp, '오답노트 해결');
            supabase.from('xp_events').insert({
              user_id: userId, event_type: 'error_note_resolved',
              xp_amount: xp, metadata: { noteId: id },
            });
            auth?.refreshProfile();
          } catch { /* offline */ }
        })();
      }

      await reload();
    },
    [userId, reload, xpToast, auth]
  );

  const removeNote = useCallback(
    async (id: number) => {
      await deleteErrorNote(id);
      if (userId) deleteErrorNoteFromCloud(id, userId).catch(() => {});
      await reload();
    },
    [userId, reload]
  );

  return { notes, loading, addNote, toggleResolved, removeNote };
}
