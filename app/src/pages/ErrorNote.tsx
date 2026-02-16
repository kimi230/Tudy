import { useState } from 'react';
import { useErrorNotes } from '../hooks/useErrorNotes';
const typeLabels: Record<string, string> = {
  vocabulary: '어휘',
  grammar: '문법',
  connected_speech: '연음',
  pronunciation: '발음',
};

const typeColors: Record<string, string> = {
  vocabulary: 'bg-blue-100 text-blue-700',
  grammar: 'bg-purple-100 text-purple-700',
  connected_speech: 'bg-orange-100 text-orange-700',
  pronunciation: 'bg-green-100 text-green-700',
};

export default function ErrorNote() {
  const { notes, loading, toggleResolved, removeNote } = useErrorNotes();
  const [filter, setFilter] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);

  const filtered = notes.filter((n) => {
    if (filter !== 'all' && n.errorType !== filter) return false;
    if (!showResolved && n.isResolved) return false;
    return true;
  });

  if (loading) {
    return <div className="text-center py-20 text-gray-400">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">오답노트</h1>
        <p className="text-gray-500 mt-1">학습 중 어려웠던 부분을 모아서 복습하세요.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {['all', 'vocabulary', 'grammar', 'connected_speech', 'pronunciation'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === type ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type === 'all' ? '전체' : typeLabels[type]}
            <span className="ml-1 text-xs opacity-75">
              ({type === 'all' ? notes.length : notes.filter((n) => n.errorType === type).length})
            </span>
          </button>
        ))}

        <label className="flex items-center gap-2 text-sm text-gray-600 ml-auto">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded text-indigo-600"
          />
          해결된 항목 표시
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">오답노트가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <div
              key={note.id}
              className={`bg-white border rounded-lg p-4 ${note.isResolved ? 'border-green-200 opacity-60' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${typeColors[note.errorType]}`}>
                      {typeLabels[note.errorType]}
                    </span>
                    {note.isResolved && (
                      <span className="text-xs text-green-600">해결됨</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 font-medium">{note.originalText}</p>
                  {note.userHeard && (
                    <p className="text-sm text-red-500 mt-1">내가 들은 것: {note.userHeard}</p>
                  )}
                  {note.explanation && (
                    <p className="text-sm text-gray-600 mt-2">{note.explanation}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(note.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => note.id && toggleResolved(note.id, !note.isResolved)}
                    className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                  >
                    {note.isResolved ? '미해결' : '해결'}
                  </button>
                  <button
                    onClick={() => note.id && removeNote(note.id)}
                    className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
