// Types
export * from './types/common.ts';
export * from './types/index.ts';
export * from './types/chinese.ts';
export * from './types/japanese.ts';

// Lib - dataLoader
export { getDifficultyLabel, formatDuration, formatTime, loadCategories, loadVideos, loadVideosByCategory, loadVideoMeta, loadSegments, loadVocabulary, loadGrammar, loadConnectedSpeech, loadStructure, loadAllArtifacts } from './lib/dataLoader.ts';

// Lib - supabase
export { supabase } from './lib/supabase.ts';

// Lib - firebase
export { isFirebaseConfigured } from './lib/firebase.ts';

// Lib - supabaseSync
export { requireSupabase, setDefaultLanguage, getDefaultLanguage, syncSessionToCloud, pullSessionsFromCloud, getAllSessionsFromCloud, syncErrorNoteToCloud, pullErrorNotesFromCloud, updateErrorNoteInCloud, deleteErrorNoteFromCloud, syncDictationToCloud, pullDictationFromCloud, deleteDictationFromCloud, uploadRecordingToStorage, saveRecordingMeta, getRecordingsBySessionFromCloud, getRecordingPublicUrl } from './lib/supabaseSync.ts';
export type { RecordingMeta } from './lib/supabaseSync.ts';

// Lib - xpService
export { awardXP } from './lib/xpService.ts';

// Lib - youtube
export { loadYouTubeAPI, createPlayer, seekToSegment, setPlaybackRate } from './lib/youtube.ts';

// Lib - dailyLearningSync
export type { DailyLearningProgress } from './lib/dailyLearningSync.ts';
export { getAllDailyProgress, getActiveDailyVideo, setActiveDailyVideo, updateDailyProgress } from './lib/dailyLearningSync.ts';

// Lib - dictationScorer
export { scoreDictation } from './lib/dictationScorer.ts';

// Lib - languageHelpers
export { getSegmentText, getSegmentReading, getLanguageLabel, getDictationPlaceholder, getErrorTypeLabels, getConnectedSpeechLabel, getVocabPhonetic, getThemeColors } from './lib/languageHelpers.ts';
export type { ThemeColors } from './lib/languageHelpers.ts';

// Hooks
export { useAuth } from './hooks/useAuth.ts';
export { useStudySession } from './hooks/useStudySession.ts';
export { useDictation } from './hooks/useDictation.ts';
export type { SegmentStat } from './hooks/useDictation.ts';
export { useErrorNotes } from './hooks/useErrorNotes.ts';
export { useRecording } from './hooks/useRecording.ts';
export { useRewards, XP_RULES, calcDailySessionXP, calcVocabQuizXP } from './hooks/useRewards.ts';
export { useYouTubePlayer } from './hooks/useYouTubePlayer.ts';
export { useDailyLearning } from './hooks/useDailyLearning.ts';

// Contexts
export { AuthProvider, AuthContext } from './contexts/AuthContext.tsx';
export { XPToastProvider, XPToastContext } from './contexts/XPToastContext.tsx';

// Components
export { default as LoginPage } from './components/auth/LoginPage.tsx';
export { default as UserMenu } from './components/auth/UserMenu.tsx';
export { default as RequireAuth } from './components/auth/RequireAuth.tsx';
export { default as Spinner } from './components/common/Spinner.tsx';
export { default as ProgressBar } from './components/common/ProgressBar.tsx';
export { default as YouTubePlayer } from './components/common/YouTubePlayer.tsx';
export type { YouTubePlayerHandle } from './components/common/YouTubePlayer.tsx';
export { default as DifficultyBadge } from './components/common/DifficultyBadge.tsx';
export { default as VideoModeModal } from './components/common/VideoModeModal.tsx';
export { default as Header } from './components/layout/Header.tsx';
export { default as MobileNav } from './components/layout/MobileNav.tsx';
export { default as ScrollToTop } from './components/layout/ScrollToTop.tsx';
export { default as XPBar } from './components/rewards/XPBar.tsx';
export { default as BadgeGrid } from './components/rewards/BadgeGrid.tsx';
export { default as StreakDisplay } from './components/rewards/StreakDisplay.tsx';
export { default as XPToast } from './components/rewards/XPToast.tsx';
export { default as TranscriptPanel } from './components/transcript/TranscriptPanel.tsx';
export { default as SegmentRow } from './components/transcript/SegmentRow.tsx';

// Study components
export { default as StudyWorkflow } from './components/study/StudyWorkflow.tsx';
export { default as StepIndicator } from './components/study/StepIndicator.tsx';
export { default as Step1_Listen } from './components/study/Step1_Listen.tsx';
export { default as Step2_Notes } from './components/study/Step2_Notes.tsx';
export { default as Step3_Mark } from './components/study/Step3_Mark.tsx';
export { default as Step4_Compare } from './components/study/Step4_Compare.tsx';
export { default as Step5_Analyze } from './components/study/Step5_Analyze.tsx';
export { default as Step6_Review } from './components/study/Step6_Review.tsx';
export { default as Step7_ErrorNote } from './components/study/Step7_ErrorNote.tsx';
export { default as Step8_Shadow } from './components/study/Step8_Shadow.tsx';
export { default as Step9_Record } from './components/study/Step9_Record.tsx';
export { default as Step10_Summary, Step10_SidePanel, Step10_Bottom } from './components/study/Step10_Summary.tsx';

// Dictation components
export { default as DictationWorkflow } from './components/dictation/DictationWorkflow.tsx';
export { default as DictationPlayer } from './components/dictation/DictationPlayer.tsx';
export { default as DictationResult } from './components/dictation/DictationResult.tsx';
export { default as DictationReview } from './components/dictation/DictationReview.tsx';
export { default as DifficultySelector } from './components/dictation/DifficultySelector.tsx';
export type { DifficultyFilter } from './components/dictation/DifficultySelector.tsx';

// Daily components
export { default as DailyWorkflow } from './components/daily/DailyWorkflow.tsx';
export { default as DailyVideoSelector } from './components/daily/DailyVideoSelector.tsx';
export { default as VocabQuiz } from './components/daily/VocabQuiz.tsx';

// Vocab quiz engine
export { generateQuiz, calcQuizResult } from './lib/vocabQuizEngine.ts';
export type { QuizQuestion, QuizResult } from './lib/vocabQuizEngine.ts';

// Vocabulary components
export { default as VocabCard } from './components/vocabulary/VocabCard.tsx';
export { default as EtymologyView } from './components/vocabulary/EtymologyView.tsx';
export { default as VocabDetailView } from './components/vocabulary/VocabDetailView.tsx';
export { default as VocabPractice } from './components/vocabulary/VocabPractice.tsx';

// Pages
export { default as HomePage } from './pages/Home.tsx';
export { default as CategoryPage } from './pages/Category.tsx';
export { default as StudyPage } from './pages/Study.tsx';
export { default as DictationPage } from './pages/Dictation.tsx';
export { default as DailyLearningPage } from './pages/DailyLearning.tsx';
export { default as LibraryPage } from './pages/Library.tsx';
export { default as VocabularyPage } from './pages/Vocabulary.tsx';
export { default as ErrorNotePage } from './pages/ErrorNote.tsx';
export { default as ProfilePage } from './pages/Profile.tsx';
export { default as RequestPage } from './pages/Request.tsx';
export { default as AboutPage } from './pages/About.tsx';
export { default as UpdatesPage } from './pages/Updates.tsx';
export { default as SubscribePage } from './pages/Subscribe.tsx';
