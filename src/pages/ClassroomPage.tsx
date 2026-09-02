import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { generateQuestion, evaluateAnswer, saveLessonToDatabase } from '@/services/aiService';
import { continueTeachingTurn } from '@/services/teacherService';
import { retrieveRelevantContext } from '@/services/ragService';
import { cancelSpeech, speak, startListening, stopListening } from '@/services/voiceService';
import { avatarService, initializeAvatarSession, setAvatarTalking, stopAvatarSession, streamAvatarVideo } from '@/services/avatarService';
import type { AvatarSession } from '@/services/avatarService';
import type { SuggestedVisual } from '@/services/teacherService';
import {
  Brain, Volume2, VolumeX, Mic, MicOff, Send, CheckCircle2, XCircle, Lightbulb, TrendingUp,
  Clock, BookOpen, HelpCircle, Eye, Code, Calculator, FlaskConical, Scroll, Zap,
  ChevronRight, RotateCcw, Sparkles, MessageSquare, Copy, Loader2,
} from 'lucide-react';
import type { Question, Evaluation, SubjectType, ChatMessage } from '@/models';

const subjectIcons: Record<SubjectType, typeof Code> = {
  Mathematics: Calculator,
  Physics: Zap,
  Biology: FlaskConical,
  History: Scroll,
  Programming: Code,
  General: BookOpen,
};

const subjectVisuals: Record<SubjectType, { label: string; content: React.ReactNode }> = {
  Mathematics: {
    label: 'Equation & Graph',
    content: (
      <div className="font-mono text-sm space-y-2">
        <div className="text-cyan-300">f(x) = ax² + bx + c</div>
        <div className="text-slate-400">Roots: x = (-b ± √(b²-4ac)) / 2a</div>
        <div className="mt-4 p-3 rounded-lg bg-ink-900/60 border border-white/5">
          <div className="text-violet-300">Example: x² - 5x + 6 = 0</div>
          <div className="text-slate-400 mt-1">x = (5 ± √(25-24)) / 2 = (5 ± 1) / 2</div>
          <div className="text-success-400 mt-1">x = 3 or x = 2</div>
        </div>
      </div>
    ),
  },
  Physics: {
    label: 'Diagram & Formula',
    content: (
      <div className="space-y-3">
        <div className="font-mono text-cyan-300 text-sm">F = m × a</div>
        <div className="p-3 rounded-lg bg-ink-900/60 border border-white/5">
          <div className="flex items-center justify-center gap-4 text-xs text-slate-300">
            <div className="w-12 h-12 rounded-full bg-violet-500/30 border-2 border-violet-400 flex items-center justify-center">m</div>
            <div className="text-2xl text-violet-300">→</div>
            <div className="text-violet-300">F</div>
            <div className="text-2xl text-violet-300">→</div>
            <div className="text-cyan-300">a</div>
          </div>
          <div className="text-center text-xs text-slate-400 mt-2">Force accelerates mass</div>
        </div>
      </div>
    ),
  },
  Biology: {
    label: 'Labeled Diagram',
    content: (
      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-ink-900/60 border border-white/5">
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32 rounded-full bg-violet-500/20 border-2 border-violet-400/50 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400/40" />
              <div className="absolute top-1 text-xs text-cyan-300">Nucleus</div>
              <div className="absolute bottom-1 text-xs text-violet-300">Cell Membrane</div>
            </div>
          </div>
          <div className="text-center text-xs text-slate-400 mt-2">Animal Cell Structure</div>
        </div>
      </div>
    ),
  },
  History: {
    label: 'Timeline',
    content: (
      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-ink-900/60 border border-white/5">
          <div className="flex items-center gap-2 text-xs">
            {['1914', '1917', '1918', '1919'].map((y, i) => (
              <div key={y} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-violet-400' : 'bg-slate-600'}`} />
                  <div className="text-slate-400 mt-1">{y}</div>
                </div>
                {i < 3 && <div className="w-8 h-0.5 bg-slate-600" />}
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-400 mt-2">Key events timeline</div>
        </div>
      </div>
    ),
  },
  Programming: {
    label: 'Code & Output',
    content: (
      <div className="font-mono text-sm space-y-1">
        <div className="p-3 rounded-lg bg-ink-900/60 border border-white/5">
          <div className="text-violet-300">def <span className="text-cyan-300">sum_list</span>(nums):</div>
          <div className="text-slate-300 ml-4">return <span className="text-cyan-300">sum</span>(nums)</div>
          <div className="text-slate-500 mt-2">{'>>> sum_list([1, 2, 3])'}</div>
          <div className="text-success-400">6</div>
        </div>
      </div>
    ),
  },
  General: {
    label: 'Concept Map',
    content: (
      <div className="p-3 rounded-lg bg-ink-900/60 border border-white/5">
        <div className="flex items-center justify-center gap-3 text-sm">
          <div className="px-3 py-2 rounded-lg bg-violet-500/20 text-violet-200">Core Idea</div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
          <div className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-200">Components</div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
          <div className="px-3 py-2 rounded-lg bg-success-500/20 text-success-200">Application</div>
        </div>
      </div>
    ),
  },
};

/** Renders any structured teacher visual without relying on a subject or topic name. */
function DynamicVisualViewer({ visual }: { visual: SuggestedVisual }) {
  const type = visual.type as string;
  const steps = visual.content
    .split(/\s*(?:→|->|\n|;|\|)\s*/)
    .map((step) => step.trim())
    .filter(Boolean);

  if (type === 'code') {
    return (
      <div className="relative overflow-x-auto rounded-lg border border-violet-400/15 bg-ink-950/80 p-3 font-mono text-xs">
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(visual.content)}
          className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Copy code"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <pre className="pr-8 text-violet-200 whitespace-pre-wrap break-words"><code>{visual.content}</code></pre>
      </div>
    );
  }

  if (type === 'equation') {
    return (
      <div className="space-y-2 rounded-lg border border-cyan-400/20 bg-cyan-500/5 px-4 py-3 font-mono text-center text-base text-cyan-200 shadow-inner">
        {steps.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
      </div>
    );
  }

  if (type === 'timeline') {
    return (
      <ol className="relative ml-2 space-y-3 border-l border-cyan-400/30 pl-5">
        {steps.map((event, index) => (
          <li key={`${event}-${index}`} className="relative text-sm text-slate-200">
            <span className="absolute -left-[1.68rem] top-1 h-3 w-3 rounded-full border-2 border-ink-900 bg-cyan-400" />
            {event}
          </li>
        ))}
      </ol>
    );
  }

  if (type === 'notes' || type === 'text') {
    return (
      <ul className="space-y-2">
        {steps.map((point, index) => (
          <li key={`${point}-${index}`} className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
            <span className="mr-2 text-cyan-300">•</span>{point}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => (
        <div key={`${step}-${index}`} className="flex items-center gap-2">
          <span className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-100">{step}</span>
          {index < steps.length - 1 && <ChevronRight className="h-4 w-4 text-cyan-300" />}
        </div>
      ))}
    </div>
  );
}

export default function ClassroomPage() {
  const navigate = useNavigate();
  const { lesson, student, setLesson } = useApp();
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [understanding, setUnderstanding] = useState(0);
  const [strongConcepts, setStrongConcepts] = useState<string[]>([]);
  const [weakConcepts, setWeakConcepts] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [awaitingAnswer, setAwaitingAnswer] = useState(false);
  const [answerInput, setAnswerInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [showReExplain, setShowReExplain] = useState(false);
  const [teacherMessage, setTeacherMessage] = useState('');
  const [difficulty, setDifficulty] = useState(2);
  const [voiceOn, setVoiceOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [currentVisual, setCurrentVisual] = useState<SuggestedVisual | undefined>(undefined);
  const [isSubmittingTurn, setIsSubmittingTurn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [retrievedContext, setRetrievedContext] = useState<string[]>([]);
  const [greetingError, setGreetingError] = useState<string | null>(null);
  const [visualTab, setVisualTab] = useState<'visuals' | 'notes' | 'code'>('visuals');
  const [avatarSession, setAvatarSession] = useState<AvatarSession>(() => avatarService.getSession());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const executeTurnRef = useRef<(message?: string, skipAdvance?: boolean) => Promise<void>>();

  const subject = lesson?.subject || 'General';
  const SubjectIcon = subjectIcons[subject];
  const lessonSegments = lesson?.segments || [];
  const lessonConcepts = lesson?.concepts || [];
  const currentSegment = lessonSegments[segmentIndex];
  const currentConcept = lessonConcepts.find((c) => c.id === currentSegment?.conceptId);
  const fallbackVisual: SuggestedVisual = {
    type: 'diagram',
    title: `${lesson?.topic || 'Lesson'} concept map`,
    content: [currentConcept?.name || lesson?.topic || 'Core concept', currentConcept?.description || 'Key relationships', 'Apply and reflect'].join(' -> '),
    explanation: `A learning map for ${currentConcept?.name || lesson?.topic || 'this lesson'} that updates when Prof. Nova provides a visual.`,
  };
  // During a new turn, show context for the active concept instead of stale topic-specific art.
  const displayedVisual = isThinking || !currentVisual ? fallbackVisual : currentVisual;
  const lessonProgress = lessonSegments.length > 0
    ? Math.round((segmentIndex / lessonSegments.length) * 100)
    : 0;

  const clampUnderstanding = useCallback((value: number) => Math.max(0, Math.min(100, value)), []);
  const applyUnderstandingDelta = useCallback((delta: number) => {
    setUnderstanding((current) => clampUnderstanding(current + delta));
  }, [clampUnderstanding]);

  useEffect(() => {
    if (!lesson || !student) {
      navigate('/learn');
      return;
    }

    // Initialize with concept greeting using AI Teaching Loop
    const initializeLesson = async () => {
      setIsThinking(true);
      setGreetingError(null);
      try {
        const response = await continueTeachingTurn(
          student,
          lesson,
          0,
          [],
          undefined,
          retrievedContext.length > 0 ? retrievedContext : undefined,
          student.language
        );
        setTeacherMessage(response.teacherMessage);
        if (typeof response.confidence === 'number') {
          setUnderstanding((current) => clampUnderstanding(Math.round(response.confidence! * 100) || current));
        }
        setHistory([{ 
          role: 'teacher', 
          content: response.teacherMessage,
          timestamp: new Date().toISOString(),
        }]);
        if (response.suggestedVisual) {
          setCurrentVisual(response.suggestedVisual);
          setVisualTab('visuals');
        }
        void speakTeacherMessage(response.teacherMessage);
      } catch (error) {
        console.error('Error initializing lesson:', error);
        const fallbackMessage = `Hello ${student?.name || 'there'}! I'm your AI Teacher. Today we'll explore ${lesson.title}. Let's begin!`;
        setGreetingError('The AI teacher could not connect. You can continue with the lesson, or try again later.');
        setTeacherMessage(fallbackMessage);
      } finally {
        setIsThinking(false);
      }
    };

    initializeLesson();
  }, [lesson, navigate, retrievedContext, student]);

  useEffect(() => {
    const unsubscribe = avatarService.subscribe(setAvatarSession);
    void initializeAvatarSession('browser').then(() => streamAvatarVideo());
    return () => {
      unsubscribe();
      stopAvatarSession();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isThinking]);

  const speakTeacherMessage = useCallback(async (message: string, force = false) => {
    if (!voiceOn && !force) return;
    const language = student?.language === 'Hindi' || student?.language === 'Hinglish' ? 'hi-IN' : 'en-US';
    try {
      setIsSpeaking(true);
      setAvatarTalking(true);
      await speak(message, {
        language,
        onStart: () => {
          setIsSpeaking(true);
          setAvatarTalking(true);
        },
        onEnd: () => {
          setIsSpeaking(false);
          setAvatarTalking(false);
        },
      });
    } catch (error) {
      console.warn('Voice playback unavailable:', error);
      setIsSpeaking(false);
      setAvatarTalking(false);
    }
  }, [student?.language, voiceOn]);

  const addTeacherMessage = useCallback((msg: string) => {
    setTeacherMessage(msg);
    setHistory((h) => [...h, {
      role: 'teacher',
      content: msg,
      timestamp: new Date().toISOString(),
    }]);
    if (voiceOn) {
      void speakTeacherMessage(msg);
    }
  }, [speakTeacherMessage, voiceOn]);

  const addStudentMessage = useCallback((msg: string) => {
    setHistory((h) => [...h, {
      role: 'student',
      content: msg,
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  const handleMicInput = useCallback(async () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
      return;
    }
    const language = student?.language === 'Hindi' || student?.language === 'Hinglish' ? 'hi-IN' : 'en-US';
    try {
      setIsListening(true);
      const transcript = await startListening({
        language,
        interimResults: true,
        onTranscript: (liveTranscript) => setAnswerInput(liveTranscript),
      });
      setAnswerInput(transcript);
    } catch (error) {
      console.warn('Voice input unavailable:', error);
      setGreetingError('Microphone input is unavailable. Please check browser permissions or type your answer.');
    } finally {
      setIsListening(false);
    }
  }, [isListening, student?.language]);

  /**
   * Execute a teaching turn using AI Teaching Loop service
   */
  const executeContinueLessonTurn = useCallback(
    async (userMessage?: string, skipAdvance = false) => {
      if (!lesson || !student) {
        setGreetingError('No active lesson or student was found. Returning to your lessons.');
        navigate('/learn');
        return;
      }

      setIsThinking(true);
      setGreetingError(null);
      try {
        const turnHistory = userMessage
          ? [...history, {
              role: 'student' as const,
              content: userMessage,
              timestamp: new Date().toISOString(),
            }]
          : history;
        const response = await continueTeachingTurn(
          student,
          lesson,
          currentSegment?.conceptId ? lessonConcepts.findIndex((c) => c.id === currentSegment.conceptId) : 0,
          turnHistory,
          userMessage,
          retrievedContext.length > 0 ? retrievedContext : undefined,
          student.language
        );

        setTeacherMessage(response.teacherMessage);
        if (typeof response.confidence === 'number') {
          setUnderstanding((current) => clampUnderstanding(Math.round(response.confidence! * 100) || current));
        } else {
          applyUnderstandingDelta(4);
        }

        if (!userMessage) {
          setHistory([{ 
            role: 'teacher', 
            content: response.teacherMessage,
            timestamp: new Date().toISOString(),
          }]);
        } else {
          addTeacherMessage(response.teacherMessage);
        }

        if (response.suggestedVisual) {
          setCurrentVisual(response.suggestedVisual);
          setVisualTab('visuals');
        }
        void speakTeacherMessage(response.teacherMessage);

        // Handle next action from teaching service
        if (!skipAdvance) {
          if (response.nextAction === 'ask_question') {
            // Generate a question for the student
            if (currentSegment) {
              const q = await generateQuestion(currentSegment.conceptId, lesson.subject, difficulty);
              setCurrentQuestion(q);
              setAwaitingAnswer(true);
              const opts = q.options ? '\n\n' + q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o.label}`).join('\n') : '';
              // Teacher message already set by continueTeachingTurn
            }
          } else if (response.nextAction === 'next_concept' || response.nextAction === 'explain') {
            // Auto-advance after a short delay
            setTimeout(() => {
              advanceSegment();
            }, 1500);
          }
        }
      } catch (error) {
        console.error('Error executing teaching turn:', error);
        setGreetingError('The AI teacher is temporarily unavailable. Your conversation is still safe. Please try again.');
      } finally {
        setIsThinking(false);
      }
    },
    [lesson, student, history, currentSegment, lessonConcepts, difficulty, retrievedContext, addTeacherMessage, navigate, speakTeacherMessage]
  );

  useEffect(() => {
    executeTurnRef.current = executeContinueLessonTurn;
  }, [executeContinueLessonTurn]);

  const handleSendMessage = useCallback(async (inputText: string) => {
    const message = inputText.trim();
    if (!message || isThinking || isSubmittingTurn || !lesson || !student) return;

    const userTurn: ChatMessage = {
      role: 'student',
      content: message,
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...history, userTurn];
    setHistory(updatedHistory);
    setAnswerInput('');
    setIsThinking(true);
    setIsSubmittingTurn(true);
    setGreetingError(null);

    try {
      const conceptIndex = currentSegment?.conceptId
        ? lessonConcepts.findIndex((concept) => concept.id === currentSegment.conceptId)
        : 0;

      const res = await continueTeachingTurn(
        student,
        lesson,
        Math.max(0, conceptIndex),
        updatedHistory,
        message,
        retrievedContext.length > 0 ? retrievedContext : undefined,
        student.language
      );

      const teacherTurn: ChatMessage = {
        role: 'teacher',
        content: res.teacherMessage,
        timestamp: new Date().toISOString(),
      };

      setTeacherMessage(res.teacherMessage);
      setHistory((latestHistory) => [...latestHistory, teacherTurn]);

      if (res.suggestedVisual) {
        setCurrentVisual(res.suggestedVisual);
        setVisualTab('visuals');
      }

      void speakTeacherMessage(res.teacherMessage);
    } catch (error) {
      console.error('Error sending classroom message:', error);
      setGreetingError('Your message could not be processed. Please try again. The conversation state was preserved.');
    } finally {
      setIsThinking(false);
      setIsSubmittingTurn(false);
    }
  }, [currentSegment?.conceptId, history, isThinking, isSubmittingTurn, lesson, lessonConcepts, retrievedContext, speakTeacherMessage, student]);

  const advanceSegment = useCallback(() => {
    if (!lesson) return;
    const nextIdx = segmentIndex + 1;
    if (nextIdx >= lessonSegments.length) {
      // Lesson complete → go to assessment
      if (lesson) {
        setLesson({ ...lesson, status: 'in-progress' });
      }
      navigate('/assessment');
      return;
    }
    setSegmentIndex(nextIdx);
    setCurrentQuestion(null);
    setAwaitingAnswer(false);
    setEvaluation(null);
    setShowReExplain(false);
    applyUnderstandingDelta(8);

    // Use AI Teaching Loop for segment transitions
    executeContinueLessonTurn(undefined, true);
  }, [lesson, segmentIndex, navigate, setLesson, executeContinueLessonTurn, applyUnderstandingDelta]);

  const handleSkipExplanation = useCallback(() => {
    const prompt = 'I already understand the theory. Skip the explanation and give me a practical exercise or question to test my understanding directly.';
    if (isThinking || isSubmittingTurn || !lesson || !student) return;
    addStudentMessage(prompt);
    void executeContinueLessonTurn(prompt);
  }, [addStudentMessage, executeContinueLessonTurn, isSubmittingTurn, isThinking, lesson, student]);

  const handleTestYourself = useCallback(async () => {
    if (!lesson || !student || isThinking || isSubmittingTurn || isSaving) return;

    setIsSaving(true);
    setGreetingError(null);

    try {
      await saveLessonToDatabase(lesson);
      setLesson(lesson);
    } catch (error) {
      console.error('Failed to save active lesson before assessment:', error);
      setLesson(lesson);
    } finally {
      navigate('/assessment');
      setIsSaving(false);
    }
  }, [isSaving, isSubmittingTurn, isThinking, lesson, navigate, setLesson, student]);

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;
    const response = selectedOption || answerInput.trim();
    if (!response) return;

    addStudentMessage(response);
    setAwaitingAnswer(false);
    setIsThinking(true);
    setSelectedOption(null);
    setAnswerInput('');

    try {
      await executeContinueLessonTurn(response, true);

      // First evaluate the answer
      const ev = await evaluateAnswer(currentQuestion, {
        questionId: currentQuestion.id,
        response,
        isCorrect: false,
        timeSpentMs: 5000,
      });

      setEvaluation(ev);
      setUnderstanding((u) => clampUnderstanding(u + ev.understandingDelta));

      if (ev.isCorrect) {
        addTeacherMessage(ev.feedback);
        if (currentQuestion.conceptId && !strongConcepts.includes(currentQuestion.conceptId)) {
          setStrongConcepts((s) => [...s, currentQuestion.conceptId]);
          setWeakConcepts((w) => w.filter((c) => c !== currentQuestion.conceptId));
        }
        setDifficulty(ev.newDifficulty);
      } else {
        addTeacherMessage(ev.feedback);
        setShowReExplain(true);
        if (ev.misconception && currentQuestion.conceptId && !weakConcepts.includes(currentQuestion.conceptId)) {
          setWeakConcepts((w) => [...w, currentQuestion.conceptId]);
        }
        setDifficulty(ev.newDifficulty);
      }
    } catch (error) {
      console.error('Error evaluating answer:', error);
      setGreetingError('The answer could not be evaluated right now. Please try again.');
    } finally {
      setIsThinking(false);
    }
  };

  const handleNextAfterEval = () => {
    if (evaluation && !evaluation.isCorrect && showReExplain) {
      // After re-explain, ask another question
      setShowReExplain(false);
      setEvaluation(null);
      setCurrentQuestion(null);
      setIsThinking(true);
      if (lesson && currentSegment) {
        generateQuestion(currentSegment.conceptId, lesson.subject, difficulty).then((q) => {
          setIsThinking(false);
          setCurrentQuestion(q);
          setAwaitingAnswer(true);
          setSelectedOption(null);
          setAnswerInput('');
          const opts2 = q.options ? '\n\n' + q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o.label}`).join('\n') : '';
          addTeacherMessage(`Let's try another question. ${q.prompt}${opts2}`);
        });
      }
      return;
    }
    setEvaluation(null);
    setShowReExplain(false);
    setCurrentQuestion(null);
    advanceSegment();
  };

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p>No active lesson found. Redirecting...</p>
      </div>
    );
  }

  const renderVisualPanelContent = () => {
    if (visualTab === 'notes') {
      return (
        <div className="p-4 rounded-xl bg-ink-900/40 border border-white/5 text-sm text-slate-300 whitespace-pre-wrap">
          {currentConcept?.description || 'No notes are available for this concept yet.'}
        </div>
      );
    }

    if (visualTab === 'code') {
      const codeContent = displayedVisual.type === 'code'
        ? displayedVisual.content
        : subject === 'Programming'
          ? 'No code example has been suggested yet.'
          : 'Code view is available when the teacher suggests a programming example.';
      return (
        <pre className="p-4 rounded-xl bg-ink-900/60 border border-white/5 text-xs text-cyan-200 whitespace-pre-wrap break-words overflow-x-auto">
          {codeContent}
        </pre>
      );
    }

    return (
      <div className="rounded-xl border border-white/5 bg-ink-900/40 p-4">
        <div className="mb-3 text-xs font-semibold text-slate-400">{displayedVisual.title}</div>
        <DynamicVisualViewer visual={displayedVisual} />
        <div className="mt-3 text-xs italic text-slate-500">{displayedVisual.explanation}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Top bar */}
        <div className="glass rounded-2xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-white text-sm">Prof. Nova</div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success-400 animate-pulse" />
                {isThinking ? 'Thinking...' : 'Teaching'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-sm text-slate-400 flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{lesson.title}</span>
            </div>
            <button
              type="button"
              onClick={handleSkipExplanation}
              disabled={isThinking || isSubmittingTurn}
              className="rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⏩ <span className="hidden sm:inline">Skip Explanation</span><span className="sm:hidden">Skip</span>
            </button>
            <button
              type="button"
              onClick={() => void handleTestYourself()}
              disabled={isThinking || isSubmittingTurn || isSaving}
              className="rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                  <span className="sm:hidden">Saving</span>
                </>
              ) : (
                <>
                  📝 <span className="hidden sm:inline">Test Yourself</span><span className="sm:hidden">Test</span>
                </>
              )}
            </button>
            <button onClick={handleMicInput} aria-label="Use microphone" className={`p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white ${isListening ? 'text-error-400 animate-pulse' : ''}`}>
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={() => {
                const nextVoiceOn = !voiceOn;
                setVoiceOn(nextVoiceOn);
                if (!nextVoiceOn) {
                  cancelSpeech();
                  setIsSpeaking(false);
                  setAvatarTalking(false);
                } else if (teacherMessage) {
                  void speakTeacherMessage(teacherMessage, true);
                }
              }}
              aria-label={voiceOn ? 'Mute teacher' : 'Enable teacher voice'}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
            >
              {voiceOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {greetingError && (
          <div role="alert" className="glass-card border border-error-500/30 p-4 mb-4 text-sm text-error-200">
            {greetingError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Teacher + interaction */}
          <div className="lg:col-span-2 space-y-4">
            {/* Teacher avatar + message */}
            <div className="glass-card p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div
                    role="img"
                    aria-label={`Animated Prof. Nova avatar, ${avatarSession.status}`}
                    className={`relative w-20 h-20 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center ${isThinking || isSpeaking || avatarSession.isTalking ? 'animate-pulse-glow' : ''}`}
                  >
                    {/* Browser fallback avatar surface; replace with a HeyGen/custom stream when a streamUrl is supplied. */}
                    <canvas aria-hidden="true" className="absolute inset-0 w-full h-full opacity-30 bg-gradient-to-br from-cyan-300/40 via-transparent to-violet-900/60" />
                    <Brain className="w-10 h-10 text-white" />
                    {(isSpeaking || avatarSession.isTalking) && <span className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-success-400 animate-ping" />}
                  </div>
                  <div className="text-center text-xs text-slate-400 mt-2">Prof. Nova · {avatarSession.status}</div>
                </div>
                <div className="flex-1 min-h-[80px]">
                  {isThinking ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-wave" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                      <span className="text-sm">AI Teacher is thinking...</span>
                    </div>
                  ) : (
                    <p className="text-slate-200 leading-relaxed">{teacherMessage}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Interaction area */}
            {awaitingAnswer && currentQuestion && (
              <div className="glass-card p-6 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="w-5 h-5 text-violet-300" />
                  <span className="text-sm font-semibold text-violet-300">{currentQuestion.type}</span>
                  <span className="text-xs text-slate-500">· Difficulty {currentQuestion.difficulty}/5</span>
                </div>
                <p className="text-white text-lg mb-4">{currentQuestion.prompt}</p>

                {currentQuestion.options ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentQuestion.options.map((opt, i) => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedOption(opt.label)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedOption === opt.label
                            ? 'border-violet-400/50 bg-violet-500/10'
                            : 'border-white/5 bg-ink-900/40 hover:border-white/10'
                        }`}
                      >
                        <span className="text-violet-300 font-bold mr-2">{String.fromCharCode(65 + i)}</span>
                        <span className="text-slate-200">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="input-field min-h-[80px] resize-none"
                    placeholder="Type your answer..."
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                  />
                )}

                <div className="flex items-center justify-between mt-4">
                  {currentQuestion.hint && (
                    <button
                      onClick={() => addTeacherMessage(`Hint: ${currentQuestion.hint}`)}
                      className="btn-ghost flex items-center gap-1 text-sm"
                    >
                      <Lightbulb className="w-4 h-4" />
                      Hint
                    </button>
                  )}
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedOption && !answerInput.trim()}
                    className="btn-primary flex items-center gap-2 ml-auto disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                    Submit
                  </button>
                </div>
              </div>
            )}

            {/* Evaluation feedback */}
            {evaluation && (
              <div className={`glass-card p-6 animate-bounce-in border-2 ${evaluation.isCorrect ? 'border-success-500/30' : 'border-error-500/30'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {evaluation.isCorrect ? (
                    <CheckCircle2 className="w-8 h-8 text-success-400" />
                  ) : (
                    <XCircle className="w-8 h-8 text-error-400" />
                  )}
                  <div>
                    <div className={`font-bold ${evaluation.isCorrect ? 'text-success-400' : 'text-error-400'}`}>
                      {evaluation.isCorrect ? 'Correct!' : 'Not quite...'}
                    </div>
                    <div className="text-sm text-slate-400">{evaluation.feedback}</div>
                  </div>
                </div>

                {!evaluation.isCorrect && showReExplain && evaluation.misconception && (
                  <div className="mt-4 p-4 rounded-xl bg-ink-900/60 border border-white/5 space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2 text-violet-300 text-sm font-semibold">
                      <Lightbulb className="w-4 h-4" />
                      Alternative Explanation
                    </div>
                    <p className="text-slate-300 text-sm">{evaluation.misconception.alternativeExplanation}</p>
                    <div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold">
                      <Sparkles className="w-4 h-4" />
                      Analogy
                    </div>
                    <p className="text-slate-300 text-sm">{evaluation.misconception.analogy}</p>
                    <div className="flex items-center gap-2 text-success-400 text-sm font-semibold">
                      <Eye className="w-4 h-4" />
                      Simpler Example
                    </div>
                    <p className="text-slate-300 text-sm">{evaluation.misconception.simplerExample}</p>
                  </div>
                )}

                <button onClick={handleNextAfterEval} className="btn-primary mt-4 flex items-center gap-2">
                  {evaluation.isCorrect ? 'Continue' : 'Try Another Question'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Chat history */}
            <div className="glass-card p-4 max-h-[200px] overflow-y-auto scrollbar-thin">
              <div className="space-y-2">
                {history.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-2.5 rounded-xl text-sm ${
                      msg.role === 'student'
                        ? 'bg-violet-500/15 text-violet-100'
                        : 'bg-ink-700/40 text-slate-300'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Persistent student composer: works for questions as well as free-form discussion. */}
            <form
              className="glass-card relative p-3 flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSendMessage(answerInput);
              }}
            >
              {isThinking && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-violet-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-300 animate-pulse" />
                  Thinking
                </div>
              )}
              <textarea
                value={answerInput}
                onChange={(event) => setAnswerInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendMessage(answerInput);
                  }
                }}
                placeholder={isListening ? 'Listening…' : 'Ask Prof. Nova or share your answer…'}
                aria-label="Message Prof. Nova"
                rows={1}
                className="input-field min-h-[44px] flex-1 resize-none py-2.5"
              />
              {isThinking && (
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />
              )}
              <button
                type="button"
                onClick={() => void handleMicInput()}
                aria-label={isListening ? 'Stop listening' : 'Use microphone'}
                className={`rounded-xl p-3 transition-colors ${isListening ? 'bg-error-500/15 text-error-300 animate-pulse' : 'bg-ink-900/60 text-slate-400 hover:text-white'}`}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                type="submit"
                disabled={!answerInput.trim() || isThinking}
                aria-label="Send message"
                className="btn-primary p-3 disabled:opacity-40"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>

            {/* Continue button (when not awaiting answer) */}
            {!awaitingAnswer && !evaluation && !isThinking && currentSegment && currentSegment.type !== 'question' && (
              <button onClick={() => void handleSendMessage('Please continue to the next step')} className="btn-primary w-full flex items-center justify-center gap-2">
                {segmentIndex >= lessonSegments.length - 1 ? 'Go to Assessment' : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right: Visuals + progress */}
          <div className="space-y-4">
            {/* Subject visual or AI-generated visual */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <SubjectIcon className="w-5 h-5 text-cyan-300" />
                  <span className="text-sm font-semibold text-white">
                    {displayedVisual.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-ink-900/50 p-1" role="tablist" aria-label="Classroom viewer">
                  {(['visuals', 'notes', 'code'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={visualTab === tab}
                      onClick={() => setVisualTab(tab)}
                      className={`px-2 py-1 rounded-md text-xs capitalize transition-colors ${visualTab === tab ? 'bg-violet-500/20 text-violet-200' : 'text-slate-500 hover:text-white'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-h-[120px]">
                {renderVisualPanelContent()}
              </div>
            </div>

            {/* Current concept */}
            {currentConcept && (
              <div className="glass-card p-4">
                <div className="text-xs text-slate-400 mb-1">Current Concept</div>
                <div className="font-semibold text-white">{currentConcept.name}</div>
                <div className="text-sm text-slate-400 mt-1">{currentConcept.description}</div>
              </div>
            )}

            {/* Understanding */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Understanding</span>
                <span className="text-lg font-display font-bold text-white">{understanding}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-ink-700/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${understanding}%` }}
                />
              </div>
            </div>

            {/* Lesson progress */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Lesson Progress</span>
                <span className="text-sm text-white">{lessonProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-ink-700/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-300 transition-all duration-500"
                  style={{ width: `${lessonProgress}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Segment {segmentIndex + 1} of {lessonSegments.length}
              </div>
            </div>

            {/* Strong / Weak concepts */}
            <div className="glass-card p-4 space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-success-400" />
                  <span className="text-sm text-slate-400">Strong Concepts</span>
                </div>
                {strongConcepts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {strongConcepts.map((id) => {
                      const c = lessonConcepts.find((c) => c.id === id);
                      return c ? <span key={id} className="text-xs px-2 py-1 rounded-full bg-success-500/15 text-success-400">{c.name}</span> : null;
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">None yet</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-error-400" />
                  <span className="text-sm text-slate-400">Needs Work</span>
                </div>
                {weakConcepts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {weakConcepts.map((id) => {
                      const c = lessonConcepts.find((c) => c.id === id);
                      return c ? <span key={id} className="text-xs px-2 py-1 rounded-full bg-error-500/15 text-error-400">{c.name}</span> : null;
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">None yet</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
