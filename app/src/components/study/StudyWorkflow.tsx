import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudySession } from '../../hooks/useStudySession';
import { useErrorNotes } from '../../hooks/useErrorNotes';
import {
  loadSegments,
  loadVocabulary,
  loadGrammar,
  loadConnectedSpeech,
  loadStructure,
} from '../../lib/dataLoader';
import type {
  Segment,
  VocabularyItem,
  GrammarPattern,
  ConnectedSpeech,
  SpeechStructure,
  VideoMeta,
} from '../../types';
import YouTubePlayer from '../common/YouTubePlayer';
import type { YouTubePlayerHandle } from '../common/YouTubePlayer';
import DifficultyBadge from '../common/DifficultyBadge';
import StepIndicator from './StepIndicator';
import Step1_Listen from './Step1_Listen';
import Step2_Notes from './Step2_Notes';
import Step3_Mark from './Step3_Mark';
import Step4_Compare from './Step4_Compare';
import Step5_Analyze from './Step5_Analyze';
import Step6_Review from './Step6_Review';
import Step7_ErrorNote from './Step7_ErrorNote';
import Step8_Shadow from './Step8_Shadow';
import Step9_Record from './Step9_Record';
import Step10_Summary from './Step10_Summary';

interface Props {
  videoId: string;
  meta: VideoMeta;
}

export default function StudyWorkflow({ videoId, meta }: Props) {
  const {
    session,
    loading: sessionLoading,
    goToStep,
    completeStep,
    updateNotes,
    updateMarkedSegments,
    updateReviewNeeded,
    updateSelfScore,
    updateSummary,
  } = useStudySession(videoId);

  const { notes: errorNotes, addNote: addErrorNote } = useErrorNotes(videoId);

  const [segments, setSegments] = useState<Segment[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [grammar, setGrammar] = useState<GrammarPattern[]>([]);
  const [connectedSpeech, setConnectedSpeech] = useState<ConnectedSpeech[]>([]);
  const [structure, setStructure] = useState<SpeechStructure | undefined>();
  const [dataLoading, setDataLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<YouTubePlayerHandle>(null);

  useEffect(() => {
    Promise.all([
      loadSegments(videoId).then((d) => setSegments(d.segments)),
      loadVocabulary(videoId).then(setVocabulary).catch(() => {}),
      loadGrammar(videoId).then(setGrammar).catch(() => {}),
      loadConnectedSpeech(videoId).then(setConnectedSpeech).catch(() => {}),
      loadStructure(videoId).then(setStructure).catch(() => {}),
    ]).finally(() => setDataLoading(false));
  }, [videoId]);

  // Pause YouTube & reset to 00:00 on step change
  const step = session?.currentStep;
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.pause();
    // Delay seekTo so the iframe processes pause first
    const timer = setTimeout(() => player.seekTo(0), 150);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => clearTimeout(timer);
  }, [step]);

  if (sessionLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) return null;

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1_Listen onComplete={() => completeStep(1)} />;
      case 2:
        return (
          <Step2_Notes
            notes={session.cornellNotes}
            structure={structure}
            onNotesChange={updateNotes}
            onComplete={() => completeStep(2)}
          />
        );
      case 3:
        return (
          <Step3_Mark
            currentTime={currentTime}
            segments={segments}
            notes={session.cornellNotes}
            markedSegments={session.markedSegments}
            onMarkedChange={updateMarkedSegments}
            onComplete={() => completeStep(3)}
          />
        );
      case 4:
        return (
          <Step4_Compare
            segments={segments}
            notes={session.cornellNotes}
            structure={structure}
            onComplete={() => completeStep(4)}
          />
        );
      case 5:
        return (
          <Step5_Analyze
            currentTime={currentTime}
            segments={segments}
            vocabulary={vocabulary}
            grammar={grammar}
            connectedSpeech={connectedSpeech}
            reviewNeeded={session.reviewNeeded}
            onReviewChange={updateReviewNeeded}
            onComplete={() => completeStep(5)}
          />
        );
      case 6:
        return (
          <Step6_Review
            selfScore={session.selfScore}
            onScoreChange={updateSelfScore}
            onComplete={() => completeStep(6)}
          />
        );
      case 7:
        return (
          <Step7_ErrorNote
            sessionId={session.id}
            videoId={videoId}
            segments={segments}
            markedSegments={session.markedSegments}
            reviewNeeded={session.reviewNeeded}
            errorNotes={errorNotes}
            onAddNote={addErrorNote}
            onComplete={() => completeStep(7)}
          />
        );
      case 8:
        return (
          <Step8_Shadow
            currentTime={currentTime}
            segments={segments}
            onComplete={() => completeStep(8)}
          />
        );
      case 9:
        return (
          <Step9_Record
            sessionId={session.id}
            videoId={videoId}
            segments={segments}
            onComplete={() => completeStep(9)}
          />
        );
      case 10:
        return (
          <Step10_Summary
            segments={segments}
            structure={structure}
            summary={session.summary}
            selfScore={session.selfScore}
            totalStudyTimeSec={session.totalStudyTimeSec}
            onSummaryChange={updateSummary}
            onComplete={() => completeStep(10)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header: back link + title + meta + steps */}
      <div>
        <Link to={`/category/${meta.categoryId}`} className="text-sm text-indigo-600 hover:underline">
          ← 목록으로
        </Link>
        <h1 className="text-lg font-bold text-gray-900 mt-1">{meta.title}</h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm text-gray-400">{meta.channel}</span>
          <DifficultyBadge difficulty={meta.difficulty} />
        </div>
        <div className="mt-2">
          <StepIndicator
            currentStep={step ?? 1}
            stepStatus={session.stepStatus}
            onStepClick={goToStep}
          />
        </div>
      </div>

      {/* Main content: side-by-side for steps 1-2 on PC, stacked otherwise */}
      {session.completedAt ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-4xl">🎉</p>
          <h3 className="text-xl font-bold text-gray-900">학습 완료!</h3>
          <p className="text-sm text-gray-500">
            총 {Math.floor(session.totalStudyTimeSec / 60)}분 학습 | 이해도 {session.selfScore}%
          </p>
          <Link
            to={`/category/${meta.categoryId}`}
            className="inline-block mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            목록으로 돌아가기
          </Link>
        </div>
      ) : (step === 1 || step === 2) ? (
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-4 lg:space-y-0">
          <YouTubePlayer ref={playerRef} youtubeId={meta.youtubeId} onTimeUpdate={setCurrentTime} className="lg:col-span-2" />
          <div>{renderStep()}</div>
        </div>
      ) : (
        <>
          <YouTubePlayer ref={playerRef} youtubeId={meta.youtubeId} onTimeUpdate={setCurrentTime} className="max-w-4xl" />
          <div>{renderStep()}</div>
        </>
      )}
    </div>
  );
}
