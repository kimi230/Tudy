import { useState, useRef, useCallback, useContext } from 'react';
import { saveRecording, getRecordingsBySession } from '../lib/db';
import { uploadRecordingToStorage, saveRecordingMeta } from '../lib/supabaseSync';
import { AuthContext } from '../contexts/AuthContext';
import type { Recording } from '../types';

export function useRecording(sessionId: string, videoId: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id;

  const loadRecordings = useCallback(async () => {
    const recs = await getRecordingsBySession(sessionId);
    setRecordings(recs);
  }, [sessionId]);

  const startRecording = useCallback(async (segmentIndex: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const duration = (Date.now() - startTimeRef.current) / 1000;

        // Save locally
        await saveRecording({
          sessionId,
          videoId,
          segmentIndex,
          audioBlob: blob,
          duration,
          createdAt: new Date().toISOString(),
        });

        // Upload to Supabase Storage if logged in
        if (userId) {
          uploadRecordingToStorage(blob, userId, sessionId, segmentIndex)
            .then((path) => {
              if (path) saveRecordingMeta(userId, sessionId, videoId, segmentIndex, path, duration);
            })
            .catch(() => {});
        }

        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        await loadRecordings();

        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [sessionId, videoId, userId, loadRecordings]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const playRecording = useCallback((recording: Recording) => {
    const url = URL.createObjectURL(recording.audioBlob);
    setAudioURL(url);
    const audio = new Audio(url);
    audio.play();
  }, []);

  return {
    isRecording,
    recordings,
    audioURL,
    startRecording,
    stopRecording,
    playRecording,
    loadRecordings,
  };
}
