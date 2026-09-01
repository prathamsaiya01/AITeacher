import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { generateAssessment, gradeAssessment } from '@/services/aiService';
import { saveAssessmentResult, saveCompletedLesson } from '@/services/studentService';
import { CheckCircle2, XCircle, Clock, ArrowRight, Loader2, HelpCircle, ChevronRight } from 'lucide-react';
import type { AssessmentQuestion } from '@/models';

export default function AssessmentPage() {
  const navigate = useNavigate();
  const { lesson, student, setAssessmentResult, refreshProgress } = useApp();
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lesson) {
      navigate('/learn');
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const qs = await generateAssessment(lesson);
        if (!cancelled) {
          setQuestions(qs);
          setError(qs.length > 0 ? null : 'No assessment questions were generated. Please try again.');
        }
      } catch (error) {
        console.error('Failed to generate assessment:', error);
        if (!cancelled) setError('Unable to load the assessment. Please return to Learn and try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [lesson, navigate]);

  const handleAnswer = (value: string) => {
    const activeQuestion = questions[currentIdx];
    if (!activeQuestion) return;
    setResponses((r) => ({ ...r, [activeQuestion.id]: value }));
  };

  const handleNext = async () => {
    const activeQuestion = questions[currentIdx];
    if (!activeQuestion) return;

    const answer = activeQuestion.options ? selectedOption : textAnswer.trim();
    if (!answer) return;

    const finalResponses = { ...responses, [activeQuestion.id]: answer };
    setResponses(finalResponses);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setTextAnswer('');
      return;
    }

    setSubmitting(true);
    try {
      if (!lesson || !student) throw new Error('No active lesson or student found');
      const result = await gradeAssessment('assessment_1', lesson.id, questions, finalResponses);
      await saveCompletedLesson(student.id, lesson);
      await saveAssessmentResult(student.id, result);
      setAssessmentResult(result);
      await refreshProgress();
      navigate('/report');
    } catch (error) {
      console.error('Failed to grade assessment:', error);
      setError('Unable to grade your assessment right now. Please try submitting again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !lesson || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {error ? (
            <>
              <p role="alert" className="text-center text-error-300">{error}</p>
              <button onClick={() => navigate('/learn')} className="btn-secondary">Back to Learn</button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full border-4 border-violet-500/30 border-t-violet-400 animate-spin" />
              <p className="text-slate-400">Prof. Nova is creating your customized quiz based on today's lesson...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-violet-500/30 border-t-violet-400 animate-spin" />
          <p className="text-slate-400">Grading your answers...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const progress = Math.round(((currentIdx + 1) / questions.length) * 100);

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Final Assessment</h1>
          <p className="text-slate-400">{lesson.title} · {questions.length} questions</p>
        </div>

        {/* Progress bar */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Question {currentIdx + 1} of {questions.length}</span>
            <span className="text-sm text-white">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-ink-700/40 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex gap-1.5 mt-3">
            {questions.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full ${i < currentIdx ? 'bg-success-500' : i === currentIdx ? 'bg-violet-400' : 'bg-ink-700'}`} />
            ))}
          </div>
        </div>

        {/* Question */}
        <div className="glass-card p-8 animate-fade-in-up" key={currentQuestion.id}>
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-violet-300" />
            <span className="text-sm font-semibold text-violet-300">{currentQuestion.type}</span>
            <span className="text-xs text-slate-500">· {currentQuestion.maxScore} points</span>
          </div>
          <p className="text-white text-lg mb-6">{currentQuestion.prompt}</p>

          {currentQuestion.options ? (
            <div className="space-y-2">
              {currentQuestion.options.map((opt, i) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelectedOption(opt.label);
                    handleAnswer(opt.label);
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                    selectedOption === opt.label
                      ? 'border-violet-400/50 bg-violet-500/10'
                      : 'border-white/5 bg-ink-900/40 hover:border-white/10'
                  }`}
                >
                  <span className="w-6 h-6 rounded-lg bg-violet-500/15 flex items-center justify-center text-xs font-bold text-violet-300">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-slate-200">{opt.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <textarea
              className="input-field min-h-[100px] resize-none"
              placeholder="Type your answer..."
              value={textAnswer}
              onChange={(e) => {
                setTextAnswer(e.target.value);
                handleAnswer(e.target.value);
              }}
              autoFocus
            />
          )}

          <button
            onClick={handleNext}
            disabled={!selectedOption && !textAnswer.trim()}
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {currentIdx < questions.length - 1 ? 'Next Question' : 'Submit Assessment'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
