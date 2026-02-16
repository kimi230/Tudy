import { useState, useEffect } from 'react';
import { saveRequest, getAllRequests } from '../lib/db';
import type { UrlRequest } from '../types';

export default function Request() {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState<UrlRequest[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getAllRequests().then(setRequests);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    await saveRequest({
      url: url.trim(),
      requesterName: name.trim() || '익명',
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    setUrl('');
    setName('');
    setReason('');
    setSubmitted(true);
    const updated = await getAllRequests();
    setRequests(updated);

    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">영상 신청</h1>
        <p className="text-gray-500 mt-1">학습하고 싶은 YouTube 영상이 있나요? URL을 신청하면 24시간 내 처리됩니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL *</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이름 (선택)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="닉네임"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">신청 이유 (선택)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="왜 이 영상으로 학습하고 싶은지 알려주세요"
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          신청하기
        </button>
        {submitted && (
          <p className="text-sm text-green-600 text-center">신청이 완료되었습니다!</p>
        )}
      </form>

      {/* Request history */}
      {requests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">신청 기록</h2>
          <div className="space-y-2">
            {requests
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">{req.url}</p>
                    <p className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded shrink-0 ${
                      req.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {req.status === 'completed' ? '완료' : '대기중'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
