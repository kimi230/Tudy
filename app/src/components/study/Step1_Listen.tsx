interface Props {
  onComplete: () => void;
}

export default function Step1_Listen({ onComplete }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Step 1: 처음 듣기</h3>
        <p className="text-sm text-gray-500">자막 없이 전체 영상을 처음부터 끝까지 들어보세요. 전체적인 내용을 파악하는 것이 목표입니다.</p>
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

      <button
        onClick={onComplete}
        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        다 들었습니다 → 다음 단계
      </button>
    </div>
  );
}
