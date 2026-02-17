import { getAllSessions, getAllErrorNotes, getAllDictationAttempts } from './db';
import {
  bulkUpsertSessions,
  bulkInsertErrorNotes,
  bulkInsertDictation,
} from './supabaseSync';

const MIGRATION_KEY = 'tudy_migration_done';

export function isMigrationDone(): boolean {
  return localStorage.getItem(MIGRATION_KEY) === 'true';
}

export async function migrateLocalDataToCloud(userId: string): Promise<void> {
  if (isMigrationDone()) return;

  try {
    const [sessions, errorNotes, dictation] = await Promise.all([
      getAllSessions(),
      getAllErrorNotes(),
      getAllDictationAttempts(),
    ]);

    // Skip if nothing to migrate
    if (sessions.length === 0 && errorNotes.length === 0 && dictation.length === 0) {
      localStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }

    await Promise.all([
      bulkUpsertSessions(sessions, userId),
      bulkInsertErrorNotes(errorNotes, userId),
      bulkInsertDictation(dictation, userId),
    ]);

    // Note: recordings with blobs are not migrated to keep migration fast.
    // Old recordings remain accessible locally via IndexedDB.

    localStorage.setItem(MIGRATION_KEY, 'true');
  } catch (err) {
    console.error('Migration failed:', err);
    // Don't set flag so it retries next time
  }
}
