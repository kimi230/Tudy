import { useState, useEffect, useCallback } from 'react';
import {
  saveErrorNote,
  getErrorNotesByVideo,
  getAllErrorNotes,
  updateErrorNote,
  deleteErrorNote,
} from '../lib/db';
import type { ErrorNote } from '../types';

export function useErrorNotes(videoId?: string) {
  const [notes, setNotes] = useState<ErrorNote[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = videoId
      ? await getErrorNotesByVideo(videoId)
      : await getAllErrorNotes();
    setNotes(data);
    setLoading(false);
  }, [videoId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = videoId
        ? await getErrorNotesByVideo(videoId)
        : await getAllErrorNotes();
      if (!cancelled) {
        setNotes(data);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [videoId]);

  const addNote = useCallback(
    async (note: Omit<ErrorNote, 'id' | 'createdAt'>) => {
      await saveErrorNote({ ...note, createdAt: new Date().toISOString() });
      await reload();
    },
    [reload]
  );

  const toggleResolved = useCallback(
    async (id: number, isResolved: boolean) => {
      await updateErrorNote(id, { isResolved });
      await reload();
    },
    [reload]
  );

  const removeNote = useCallback(
    async (id: number) => {
      await deleteErrorNote(id);
      await reload();
    },
    [reload]
  );

  return { notes, loading, addNote, toggleResolved, removeNote };
}
