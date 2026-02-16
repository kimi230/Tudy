import { useState, useRef, useCallback } from 'react';
import { saveRecording, getRecordingsBySession } from '../lib/db';
import type { Recording } from '../types';

export function useRecording(sessionId: string, videoId: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

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

        await saveRecording({
          sessionId,
          videoId,
          segmentIndex,
          audioBlob: blob,
          duration,
          createdAt: new Date().toISOString(),
        });

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
