import { useState, useEffect } from 'react';

interface UpdateEntry {
  date: string;
  version: string;
  title: string;
  items: string[];
}

export default function Updates() {
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'updates.json')
      .then((r) => r.json())
      .then((data) => setUpdates(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">업데이트 기록</h1>
      <div className="space-y-6">
        {updates.map((entry) => (
          <div key={entry.version} className="border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                v{entry.version}
              </span>
              <span className="text-sm text-gray-400">{entry.date}</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{entry.title}</h2>
            <ul className="space-y-1">
              {entry.items.map((item, i) => (
                <li key={i} className="text-sm text-gray-600 flex gap-2">
                  <span className="text-indigo-400 mt-0.5">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
