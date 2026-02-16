const GOOGLE_FORM_URL = import.meta.env.VITE_GOOGLE_FORM_URL || 'https://forms.gle/mL7Sr2BTFA9e1ako6';

export default function Request() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">영상 신청</h1>
        <p className="text-gray-500 mt-1">
          학습하고 싶은 YouTube 영상이 있나요? 아래 버튼을 눌러 신청해 주세요.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center space-y-4">
        <p className="text-gray-600 text-sm">
          Google Forms에서 YouTube URL과 간단한 정보를 입력하시면 검토 후 추가됩니다.
        </p>
        <a
          href={GOOGLE_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          신청하러 가기
        </a>
      </div>
    </div>
  );
}
