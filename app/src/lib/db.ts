import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { StudySession, ErrorNote, Recording, UrlRequest, DictationAttempt } from '../types';

interface StudyDB extends DBSchema {
  sessions: {
    key: string;
    value: StudySession;
    indexes: { videoId: string };
  };
  errorNotes: {
    key: number;
    value: ErrorNote;
    indexes: { videoId: string; errorType: string };
  };
  recordings: {
    key: number;
    value: Recording;
    indexes: { sessionId: string };
  };
  requests: {
    key: number;
    value: UrlRequest;
  };
  dictationAttempts: {
    key: number;
    value: DictationAttempt;
    indexes: { videoId: string };
  };
}

let dbPromise: Promise<IDBPDatabase<StudyDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<StudyDB>('tudy-db', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          // Sessions store
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('videoId', 'videoId');

          // Error notes store
          const errorStore = db.createObjectStore('errorNotes', {
            keyPath: 'id',
            autoIncrement: true,
          });
          errorStore.createIndex('videoId', 'videoId');
          errorStore.createIndex('errorType', 'errorType');

          // Recordings store
          const recordingStore = db.createObjectStore('recordings', {
            keyPath: 'id',
            autoIncrement: true,
          });
          recordingStore.createIndex('sessionId', 'sessionId');

          // URL requests store
          db.createObjectStore('requests', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }

        if (oldVersion < 2) {
          const dictStore = db.createObjectStore('dictationAttempts', {
            keyPath: 'id',
            autoIncrement: true,
          });
          dictStore.createIndex('videoId', 'videoId');
        }
      },
    });
  }
  return dbPromise;
}

// Sessions
export async function saveSession(session: StudySession) {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function getSession(id: string) {
  const db = await getDB();
  return db.get('sessions', id);
}

export async function getSessionsByVideo(videoId: string) {
  const db = await getDB();
  return db.getAllFromIndex('sessions', 'videoId', videoId);
}

export async function getAllSessions() {
  const db = await getDB();
  return db.getAll('sessions');
}

export async function deleteSession(id: string) {
  const db = await getDB();
  await db.delete('sessions', id);
}

// Error Notes
export async function saveErrorNote(note: ErrorNote) {
  const db = await getDB();
  return db.put('errorNotes', note);
}

export async function getErrorNotesByVideo(videoId: string) {
  const db = await getDB();
  return db.getAllFromIndex('errorNotes', 'videoId', videoId);
}

export async function getAllErrorNotes() {
  const db = await getDB();
  return db.getAll('errorNotes');
}

export async function updateErrorNote(id: number, updates: Partial<ErrorNote>) {
  const db = await getDB();
  const note = await db.get('errorNotes', id);
  if (note) {
    await db.put('errorNotes', { ...note, ...updates });
  }
}

export async function deleteErrorNote(id: number) {
  const db = await getDB();
  await db.delete('errorNotes', id);
}

// Recordings
export async function saveRecording(recording: Recording) {
  const db = await getDB();
  return db.put('recordings', recording);
}

export async function getRecordingsBySession(sessionId: string) {
  const db = await getDB();
  return db.getAllFromIndex('recordings', 'sessionId', sessionId);
}

export async function deleteRecording(id: number) {
  const db = await getDB();
  await db.delete('recordings', id);
}

// URL Requests
export async function saveRequest(request: UrlRequest) {
  const db = await getDB();
  return db.put('requests', request);
}

export async function getAllRequests() {
  const db = await getDB();
  return db.getAll('requests');
}

// Dictation Attempts
export async function saveDictationAttempt(attempt: DictationAttempt) {
  const db = await getDB();
  return db.put('dictationAttempts', attempt);
}

export async function getDictationAttemptsByVideo(videoId: string) {
  const db = await getDB();
  return db.getAllFromIndex('dictationAttempts', 'videoId', videoId);
}

export async function getAllDictationAttempts() {
  const db = await getDB();
  return db.getAll('dictationAttempts');
}

export async function deleteDictationAttempt(id: number) {
  const db = await getDB();
  await db.delete('dictationAttempts', id);
}
