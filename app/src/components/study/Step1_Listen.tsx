interface Props {
  onComplete: () => void;
}

export default function Step1_Listen({ onComplete }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 1: 처음 듣기</h3>
          <p className="text-sm text-gray-500">자막 없이 끝까지 들어보세요.</p>
        </div>
        <button
          onClick={onComplete}
          className="shrink-0 ml-4 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          다음 →
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Tips</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>자막을 끄고 들으세요</li>
          <li>모든 단어를 이해하려 하지 마세요</li>
          <li>전체 주제와 흐름을 파악하세요</li>
          <li>화자의 감정과 톤에 집중하세요</li>
        </ul>
      </div>
    </div>
  );
}
