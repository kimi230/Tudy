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
  textEn: string;
  textKo: string;
  words: WordTimestamp[];
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
  etymology: string;
  rootBreakdown?: RootBreakdown;
  relatedWords?: string[];
  isEssential?: boolean;
  partOfSpeech: string;
  phonetic: string;
  contextSentence: string;
  segmentIndex: number;
}

// Grammar pattern
export interface GrammarPattern {
  pattern: string;
  example: string;
  explanationKo: string;
  segmentIndex: number;
}

// Connected speech phenomenon
export interface ConnectedSpeech {
  original: string;
  spoken: string;
  type: 'linking' | 'reduction' | 'elision' | 'assimilation';
  koreanPhonetic?: string;
  practiceGuide?: string;
  start: number;
  end: number;
  segmentIndex: number;
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

// YouTube Player types
export interface YouTubePlayerState {
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
}
