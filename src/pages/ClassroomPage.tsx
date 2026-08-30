import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { generateQuestion, evaluateAnswer } from '@/services/aiService';
import {
  Brain, Volume2, VolumeX, Send, CheckCircle2, XCircle, Lightbulb, TrendingUp,
  Clock, BookOpen, HelpCircle, Eye, Code, Calculator, FlaskConical, Scroll, Zap,
  ChevronRight, RotateCcw, Sparkles, MessageSquare,
} from 'lucide-react';
import type { Question, Evaluation, SubjectType } from '@/models';

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
  const [history, setHistory] = useState<{ role: 'teacher' | 'student'; content: string }[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const subject = lesson?.subject || 'General';
  const SubjectIcon = subjectIcons[subject];
  const currentSegment = lesson?.segments[segmentIndex];
  const currentConcept = lesson?.concepts.find((c) => c.id === currentSegment?.conceptId);
  const lessonProgress = lesson ? Math.round((segmentIndex / lesson.segments.length) * 100) : 0;

  useEffect(() => {
    if (!lesson) {
      navigate('/learn');
      return;
    }
    // Initial teacher message
    setTeacherMessage(`Hello ${student?.name}! I'm your AI Teacher. Today we'll explore ${lesson.title}. Let's begin!`);
    setHistory([{ role: 'teacher', content: `Hello ${student?.name}! I'm your AI Teacher. Today we'll explore ${lesson.title}. Let's begin!` }]);
  }, [lesson, navigate, student]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isThinking]);

  const addTeacherMessage = useCallback((msg: string) => {
    setTeacherMessage(msg);
    setHistory((h) => [...h, { role: 'teacher', content: msg }]);
  }, []);

  const addStudentMessage = useCallback((msg: string) => {
    setHistory((h) => [...h, { role: 'student', content: msg }]);
  }, []);

  const advanceSegment = useCallback(() => {
    if (!lesson) return;
    const nextIdx = segmentIndex + 1;
    if (nextIdx >= lesson.segments.length) {
      // Lesson complete → go to assessment
      if (lesson) {
        setLesson({ ...lesson, status: 'in-progress' });
      }
      navigate('/assessment');
      return;
    }
    setSegmentIndex(nextIdx);
    const seg = lesson.segments[nextIdx];
    if (seg.type === 'teach') {
      const concept = lesson.concepts.find((c) => c.id === seg.conceptId);
      setIsThinking(true);
      setTimeout(() => {
        setIsThinking(false);
        addTeacherMessage(`Now let's learn about ${concept?.name}. ${concept?.description}`);
      }, 1200);
    } else if (seg.type === 'example') {
      const concept = lesson.concepts.find((c) => c.id === seg.conceptId);
      setIsThinking(true);
      setTimeout(() => {
        setIsThinking(false);
        addTeacherMessage(`Here's an example for ${concept?.name}. Take a look at the visual area on the right.`);
      }, 1000);
    } else if (seg.type === 'question') {
      const concept = lesson.concepts.find((c) => c.id === seg.conceptId);
      setIsThinking(true);
      generateQuestion(seg.conceptId, lesson.subject, difficulty).then((q) => {
        setIsThinking(false);
        setCurrentQuestion(q);
        setAwaitingAnswer(true);
        setEvaluation(null);
        setShowReExplain(false);
        setSelectedOption(null);
        setAnswerInput('');
        const opts = q.options ? '\n\n' + q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o.label}`).join('\n') : '';
        addTeacherMessage(`Time for a question! ${q.prompt}${opts}`);
      });
    } else if (seg.type === 'summary') {
      setIsThinking(true);
      setTimeout(() => {
        setIsThinking(false);
        addTeacherMessage(`Great job! Let's summarize what we've covered today. You've learned: ${lesson.concepts.map((c) => c.name).join(', ')}. Ready for your assessment?`);
      }, 1000);
    }
  }, [lesson, segmentIndex, difficulty, addTeacherMessage, navigate, setLesson]);

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;
    const response = selectedOption || answerInput.trim();
    if (!response) return;

    addStudentMessage(response);
    setAwaitingAnswer(false);
    setIsThinking(true);

    const ev = await evaluateAnswer(currentQuestion, {
      questionId: currentQuestion.id,
      response,
      isCorrect: false,
      timeSpentMs: 5000,
    });

    setIsThinking(false);
    setEvaluation(ev);
    setUnderstanding((u) => Math.max(0, Math.min(100, u + ev.understandingDelta)));

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

  if (!lesson) return null;

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
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400 flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              {lesson.title}
            </div>
            <button onClick={() => setVoiceOn(!voiceOn)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white">
              {voiceOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Teacher + interaction */}
          <div className="lg:col-span-2 space-y-4">
            {/* Teacher avatar + message */}
            <div className="glass-card p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center ${isThinking ? 'animate-pulse-glow' : ''}`}>
                    <Brain className="w-10 h-10 text-white" />
                  </div>
                  <div className="text-center text-xs text-slate-400 mt-2">Prof. Nova</div>
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

            {/* Continue button (when not awaiting answer) */}
            {!awaitingAnswer && !evaluation && !isThinking && currentSegment && currentSegment.type !== 'question' && (
              <button onClick={advanceSegment} className="btn-primary w-full flex items-center justify-center gap-2">
                {segmentIndex >= lesson.segments.length - 1 ? 'Go to Assessment' : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right: Visuals + progress */}
          <div className="space-y-4">
            {/* Subject visual */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <SubjectIcon className="w-5 h-5 text-cyan-300" />
                <span className="text-sm font-semibold text-white">{subjectVisuals[subject].label}</span>
              </div>
              <div className="min-h-[120px]">
                {subjectVisuals[subject].content}
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
                Segment {segmentIndex + 1} of {lesson.segments.length}
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
                      const c = lesson.concepts.find((c) => c.id === id);
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
                      const c = lesson.concepts.find((c) => c.id === id);
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
