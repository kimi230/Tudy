import { useState, useCallback } from 'react';
import { useDailyLearning } from '../hooks/useDailyLearning';
import { loadSegments } from '../lib/dataLoader';
import RequireAuth from '../components/auth/RequireAuth';
import Spinner from '../components/common/Spinner';
import DailyVideoSelector from '../components/daily/DailyVideoSelector';
import DailyWorkflow from '../components/daily/DailyWorkflow';
import type { VideoEntry } from '../types';

export default function DailyLearning() {
  const { activeVideo, allProgress, loading, selectVideo, completeSession } = useDailyLearning();
  const [selectMode, setSelectMode] = useState(false);

  const handleSelectVideo = useCallback(async (video: VideoEntry, totalSegments: number) => {
    let total = totalSegments;
    if (total === 0) {
      try {
        const data = await loadSegments(video.videoId);
        total = data.segments.length;
      } catch {
        return;
      }
    }
    await selectVideo(video.videoId, total);
    setSelectMode(false);
  }, [selectVideo]);

  const handleComplete = useCallback(async (nextSegmentIndex: number, totalSegments: number) => {
    if (!activeVideo) return;
    await completeSession(activeVideo.videoId, nextSegmentIndex, totalSegments);
  }, [activeVideo, completeSession]);

  const handleChangeVideo = useCallback(() => {
    setSelectMode(true);
  }, []);

  return (
    <RequireAuth message="오늘의 학습을 시작하려면 로그인이 필요합니다.">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : !activeVideo || selectMode ? (
        <DailyVideoSelector
          allProgress={allProgress}
          onSelect={handleSelectVideo}
        />
      ) : (
        <DailyWorkflow
          key={activeVideo.videoId + '_' + activeVideo.nextSegmentIndex}
          progress={activeVideo}
          onComplete={handleComplete}
          onChangeVideo={handleChangeVideo}
        />
      )}
    </RequireAuth>
  );
}
