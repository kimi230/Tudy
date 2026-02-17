import { supabase } from './supabase';
import type { StudySession, ErrorNote, DictationAttempt } from '../types';

// --- Study Sessions ---

interface SupabaseSession {
  id: string;
  user_id: string;
  video_id: string;
  current_step: number;
  step_status: Record<number, string>;
  cornell_notes: string | object;
  marked_segments: object[];
  review_needed: number[];
  self_score: number;
  summary: string;
  total_study_time_sec: number;
  started_at: string;
  completed_at: string | null;
}

function sessionToSupabase(session: StudySession, userId: string): SupabaseSession {
  return {
    id: session.id,
    user_id: userId,
    video_id: session.videoId,
    current_step: session.currentStep,
    step_status: session.stepStatus,
    cornell_notes: session.cornellNotes,
    marked_segments: session.markedSegments,
    review_needed: session.reviewNeeded,
    self_score: session.selfScore,
    summary: session.summary,
    total_study_time_sec: session.totalStudyTimeSec,
    started_at: session.startedAt,
    completed_at: session.completedAt ?? null,
  };
}

function sessionFromSupabase(row: SupabaseSession): StudySession {
  return {
    id: row.id,
    videoId: row.video_id,
    currentStep: row.current_step,
    stepStatus: row.step_status as Record<number, 'pending' | 'in_progress' | 'completed'>,
    cornellNotes: row.cornell_notes as StudySession['cornellNotes'],
    markedSegments: row.marked_segments as StudySession['markedSegments'],
    reviewNeeded: row.review_needed,
    selfScore: row.self_score,
    summary: row.summary,
    totalStudyTimeSec: row.total_study_time_sec,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
  };
}

export async function syncSessionToCloud(session: StudySession, userId: string) {
  if (!supabase) return;
  const row = sessionToSupabase(session, userId);
  await supabase.from('study_sessions').upsert(row, { onConflict: 'id,user_id' });
}

export async function pullSessionsFromCloud(videoId: string, userId: string): Promise<StudySession[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('video_id', videoId);
  return (data ?? []).map(sessionFromSupabase);
}

// --- Error Notes ---

interface SupabaseErrorNote {
  id?: number;
  user_id: string;
  session_id: string;
  video_id: string;
  segment_index: number;
  error_type: string;
  original_text: string;
  user_heard: string;
  explanation: string;
  is_resolved: boolean;
  created_at: string;
}

function errorNoteToSupabase(note: ErrorNote, userId: string): SupabaseErrorNote {
  return {
    user_id: userId,
    session_id: note.sessionId,
    video_id: note.videoId,
    segment_index: note.segmentIndex,
    error_type: note.errorType,
    original_text: note.originalText,
    user_heard: note.userHeard,
    explanation: note.explanation,
    is_resolved: note.isResolved,
    created_at: note.createdAt,
  };
}

function errorNoteFromSupabase(row: SupabaseErrorNote): ErrorNote {
  return {
    id: row.id,
    sessionId: row.session_id,
    videoId: row.video_id,
    segmentIndex: row.segment_index,
    errorType: row.error_type as ErrorNote['errorType'],
    originalText: row.original_text,
    userHeard: row.user_heard,
    explanation: row.explanation,
    isResolved: row.is_resolved,
    createdAt: row.created_at,
  };
}

export async function syncErrorNoteToCloud(note: ErrorNote, userId: string) {
  if (!supabase) return;
  const row = errorNoteToSupabase(note, userId);
  await supabase.from('error_notes').insert(row);
}

export async function pullErrorNotesFromCloud(videoId: string | undefined, userId: string): Promise<ErrorNote[]> {
  if (!supabase) return [];
  let query = supabase.from('error_notes').select('*').eq('user_id', userId);
  if (videoId) query = query.eq('video_id', videoId);
  const { data } = await query;
  return (data ?? []).map(errorNoteFromSupabase);
}

export async function updateErrorNoteInCloud(id: number, updates: { is_resolved?: boolean }, userId: string) {
  if (!supabase) return;
  await supabase.from('error_notes').update(updates).eq('id', id).eq('user_id', userId);
}

export async function deleteErrorNoteFromCloud(id: number, userId: string) {
  if (!supabase) return;
  await supabase.from('error_notes').delete().eq('id', id).eq('user_id', userId);
}

// --- Dictation Attempts ---

interface SupabaseDictationAttempt {
  id?: number;
  user_id: string;
  video_id: string;
  segment_index: number;
  user_input: string;
  correct_text: string;
  word_results: object[];
  score: number;
  created_at: string;
}

function dictationToSupabase(attempt: DictationAttempt, userId: string): SupabaseDictationAttempt {
  return {
    user_id: userId,
    video_id: attempt.videoId,
    segment_index: attempt.segmentIndex,
    user_input: attempt.userInput,
    correct_text: attempt.correctText,
    word_results: attempt.wordResults,
    score: attempt.score,
    created_at: attempt.createdAt,
  };
}

function dictationFromSupabase(row: SupabaseDictationAttempt): DictationAttempt {
  return {
    id: row.id,
    videoId: row.video_id,
    segmentIndex: row.segment_index,
    userInput: row.user_input,
    correctText: row.correct_text,
    wordResults: row.word_results as DictationAttempt['wordResults'],
    score: row.score,
    createdAt: row.created_at,
  };
}

export async function syncDictationToCloud(attempt: DictationAttempt, userId: string) {
  if (!supabase) return;
  const row = dictationToSupabase(attempt, userId);
  await supabase.from('dictation_attempts').insert(row);
}

export async function pullDictationFromCloud(videoId: string, userId: string): Promise<DictationAttempt[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('dictation_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('video_id', videoId);
  return (data ?? []).map(dictationFromSupabase);
}

export async function deleteDictationFromCloud(id: number, userId: string) {
  if (!supabase) return;
  await supabase.from('dictation_attempts').delete().eq('id', id).eq('user_id', userId);
}

// --- Recordings ---

export async function uploadRecordingToStorage(
  blob: Blob,
  userId: string,
  sessionId: string,
  segmentIndex: number
): Promise<string | null> {
  if (!supabase) return null;
  const path = `${userId}/${sessionId}/${segmentIndex}_${Date.now()}.webm`;
  const { error } = await supabase.storage.from('recordings').upload(path, blob, {
    contentType: 'audio/webm',
  });
  if (error) {
    console.error('Recording upload failed:', error);
    return null;
  }
  return path;
}

export async function saveRecordingMeta(
  userId: string,
  sessionId: string,
  videoId: string,
  segmentIndex: number,
  storagePath: string,
  duration: number
) {
  if (!supabase) return;
  await supabase.from('recordings').insert({
    user_id: userId,
    session_id: sessionId,
    video_id: videoId,
    segment_index: segmentIndex,
    storage_path: storagePath,
    duration,
    created_at: new Date().toISOString(),
  });
}

// --- Bulk operations for migration ---

export async function bulkUpsertSessions(sessions: StudySession[], userId: string) {
  if (!supabase || sessions.length === 0) return;
  const rows = sessions.map((s) => sessionToSupabase(s, userId));
  await supabase.from('study_sessions').upsert(rows, { onConflict: 'id,user_id' });
}

export async function bulkInsertErrorNotes(notes: ErrorNote[], userId: string) {
  if (!supabase || notes.length === 0) return;
  const rows = notes.map((n) => errorNoteToSupabase(n, userId));
  await supabase.from('error_notes').insert(rows);
}

export async function bulkInsertDictation(attempts: DictationAttempt[], userId: string) {
  if (!supabase || attempts.length === 0) return;
  const rows = attempts.map((a) => dictationToSupabase(a, userId));
  await supabase.from('dictation_attempts').insert(rows);
}
