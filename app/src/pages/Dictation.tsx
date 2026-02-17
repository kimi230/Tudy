import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadVideoMeta } from '../lib/dataLoader';
import RequireAuth from '../components/auth/RequireAuth';
import Spinner from '../components/common/Spinner';
import DictationWorkflow from '../components/dictation/DictationWorkflow';
import type { VideoMeta } from '../types';

export default function Dictation() {
  const { videoId } = useParams<{ videoId: string }>();
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) return;
    loadVideoMeta(videoId)
      .then(setMeta)
      .catch(() => setError('영상 데이터를 불러올 수 없습니다.'));
  }, [videoId]);

  return (
    <RequireAuth message="딕테이션을 시작하려면 로그인이 필요합니다.">
      {error ? (
        <div className="text-center py-20">
          <p className="text-red-500 mb-4">{error}</p>
          <Link to="/" className="text-indigo-600 hover:underline">홈으로 돌아가기</Link>
        </div>
      ) : !meta || !videoId ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <DictationWorkflow videoId={videoId} meta={meta} />
      )}
    </RequireAuth>
  );
}
