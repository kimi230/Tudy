import { useState, useRef, useCallback, useContext } from 'react';
import {
  uploadRecordingToStorage,
  saveRecordingMeta,
  getRecordingsBySessionFromCloud,
  getRecordingPublicUrl,
  type RecordingMeta,
} from '../lib/supabaseSync';
import { AuthContext } from '../contexts/AuthContext';

export function useRecording(sessionId: string, videoId: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<RecordingMeta[]>([]);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const auth = useContext(AuthContext);
  const userIdRef = useRef<string | undefined>(undefined);
  userIdRef.current = auth?.user?.id;

  const loadRecordings = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    const recs = await getRecordingsBySessionFromCloud(sessionId, uid);
    setRecordings(recs);
  }, [sessionId]);

  const startRecording = useCallback(async (segmentIndex: number) => {
    const uid = userIdRef.current;
    if (!uid) return;

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

        // Upload to Supabase Storage
        const currentUid = userIdRef.current;
        if (currentUid) {
          const path = await uploadRecordingToStorage(blob, currentUid, sessionId, segmentIndex);
          if (path) {
            await saveRecordingMeta(currentUid, sessionId, videoId, segmentIndex, path, duration);
          }
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
  }, [sessionId, videoId, loadRecordings]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const playRecording = useCallback((recording: RecordingMeta) => {
    const url = getRecordingPublicUrl(recording.storage_path);
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
