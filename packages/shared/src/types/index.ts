// Category
export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  order: number;
}

// Video index entry
export interface VideoEntry {
  videoId: string;
  youtubeId: string;
  title: string;
  channel: string;
  categoryId: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  thumbnail: string;
  speechRateWpm: number;
  addedAt: string;
  descriptionKo?: string;
}

// Video metadata (per-video meta.json)
export interface VideoMeta extends VideoEntry {
  segmentCount: number;
  vocabularyCount: number;
  grammarPatternCount: number;
}

// Word-level timestamp
export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

// Transcript segment
export interface Segment {
  index: number;
  start: number;
  end: number;
  textEn?: string;    // 영어
  textZh?: string;    // 중국어
  pinyin?: string;    // 중국어 핀인
  textJa?: string;    // 일본어
  reading?: string;   // 일본어 히라가나
  textKo: string;
  words: WordTimestamp[];
  listenDifficulty?: number; // 1-5 세그먼트별 듣기 난이도
}

// Segments file
export interface SegmentsData {
  videoId: string;
  segments: Segment[];
}

// Vocabulary item
export interface RootBreakdown {
  prefix: string | null;
  root: string;
  suffix: string | null;
}

export interface VocabularyItem {
  word: string;
  definition: string;
  koreanMeaning: string;
  etymology?: string;
  rootBreakdown?: RootBreakdown;
  relatedWords?: string[];
  isEssential?: boolean;
  partOfSpeech: string;
  phonetic?: string;
  contextSentence: string;
  contextSentenceKo?: string;
  segmentIndex: number;
  // Chinese fields
  pinyin?: string;
  tones?: number[];
  hskLevel?: number | null;
  measureWord?: string;
  components?: { character: string; pinyin: string; meaning: string }[];
  // Japanese fields
  reading?: string;
  kanji?: string;
  jlptLevel?: number | null;
  pitchAccent?: number[];
  kanjiReadings?: { kanji: string; onyomi: string[]; kunyomi: string[] }[];
}

// Grammar pattern
export interface GrammarPattern {
  pattern: string;
  example: string;
  explanationKo: string;
  segmentIndex: number;
}

// Connected speech / tone / keigo phenomenon (language-polymorphic)
export interface ConnectedSpeech {
  // English fields
  original?: string;
  spoken?: string;
  type?: string;
  koreanPhonetic?: string;
  practiceGuide?: string;
  start?: number;
  end?: number;
  segmentIndex: number;
  // Chinese fields (tone phenomena)
  originalText?: string;
  pinyin?: string;
  toneChange?: string;
  explanationKo?: string;
  // Japanese fields (keigo phenomena)
  reading?: string;
  baseForm?: string;
  politeLevel?: string;
  usageContext?: string;
}

// Speech structure section
export interface StructureSection {
  section?: string;        // free-text section name (e.g. "Hook / Opening Question")
  title?: string;          // alternative section name field
  titleKo?: string;        // Korean title
  type?: string;           // legacy type field (intro/body/conclusion/transition)
  startSegment: number;
  endSegment: number;
  summary: string;
  summaryKo?: string;
  keyPoints?: string[];
  signalExpressions?: string[];
}

export interface SignalExpression {
  expression: string;
  type: string;
  segmentIndex: number;
  role: string;
}

export interface SpeechStructure {
  sections: StructureSection[];
  signalExpressions?: SignalExpression[];
}

// Structured note section
export interface NoteSection {
  id: string;
  type: 'intro' | 'body' | 'conclusion';
  content: string;
}

// Cornell Notes structure
export interface CornellNotes {
  cues: string;
  notes: string;
  summary: string;
  sections?: NoteSection[];
}

// IndexedDB types

export interface StudySession {
  id: string; // `${videoId}_${timestamp}`
  videoId: string;
  currentStep: number;
  stepStatus: Record<number, 'pending' | 'in_progress' | 'completed'>;
  cornellNotes: string | CornellNotes;
  markedSegments: MarkedSegment[];
  reviewNeeded: number[];
  selfScore: number;
  summary: string;
  totalStudyTimeSec: number;
  startedAt: string;
  completedAt?: string;
}

export interface MarkedSegment {
  segmentIndex: number;
  color: 'blue' | 'red';
}

export interface ErrorNote {
  id?: number;
  sessionId: string;
  videoId: string;
  segmentIndex: number;
  errorType: 'vocabulary' | 'grammar' | 'connected_speech' | 'pronunciation';
  originalText: string;
  userHeard: string;
  explanation: string;
  isResolved: boolean;
  createdAt: string;
}

export interface Recording {
  id?: number;
  sessionId: string;
  videoId: string;
  segmentIndex: number;
  audioBlob: Blob;
  duration: number;
  createdAt: string;
}

export interface UrlRequest {
  id?: number;
  url: string;
  requesterName: string;
  reason: string;
  status: 'pending' | 'completed';
  createdAt: string;
}

// Dictation types
export interface DictationAttempt {
  id?: number;
  videoId: string;
  segmentIndex: number;
  userInput: string;
  correctText: string;
  wordResults: DictationWordResult[];
  score: number; // 0-100
  createdAt: string;
}

export interface DictationWordResult {
  expected: string;
  actual: string | null; // null = 빠뜨린 단어
  isCorrect: boolean;
}

// YouTube Player types
export interface YouTubePlayerState {
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
}
