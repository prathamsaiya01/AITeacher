import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { generateLearningReport } from '@/services/aiService';
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Target,
  Brain,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import type { LearningReport } from '@/models';

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative h-32 w-32">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 140 140" aria-label={`Score ${score}%`}>
        <circle cx="70" cy="70" r={radius} stroke="rgba(148, 163, 184, 0.18)" strokeWidth="12" fill="transparent" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke={progress >= 80 ? '#34d399' : progress >= 60 ? '#fbbf24' : '#f87171'}
          strokeWidth="12"
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-display font-bold text-white">{score}</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Score</span>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const navigate = useNavigate();
  const { lesson, assessmentResult, setLearningReport, refreshData } = useApp();
  const [report, setReport] = useState<LearningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lesson || !assessmentResult) {
      navigate('/learn');
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const generated = await generateLearningReport(lesson, assessmentResult);
        if (cancelled) return;

        setReport(generated);
        setLearningReport(generated);
        await refreshData();
      } catch (err) {
        console.error('Failed to generate learning report:', err);
        if (!cancelled) {
          setError('Unable to generate your learning report right now. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [assessmentResult, lesson, navigate, refreshData, setLearningReport]);

  if (loading || !report || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card max-w-md w-full p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500/30 border-t-violet-400" />
          </div>
          <p className="text-lg font-semibold text-white">Prof. Nova is analyzing your quiz results…</p>
          <p className="mt-2 text-sm text-slate-400">Gemini is reviewing your performance and preparing a personalized learning report.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card max-w-md w-full p-8 text-center">
          <p role="alert" className="text-center text-error-300">{error}</p>
          <button onClick={() => navigate('/assessment')} className="btn-secondary mt-6">Back to Assessment</button>
        </div>
      </div>
    );
  }

  const score = report.score;
  const scoreTone = score >= 80 ? 'text-success-400' : score >= 60 ? 'text-warning-400' : 'text-error-400';

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-violet-600/15 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
            <Trophy className="h-4 w-4 text-warning-400" />
            Learning Report
          </div>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{lesson.title}</h1>
          <p className="mt-3 text-slate-400">{report.summary}</p>
        </div>

        <div className="glass-card mb-6 p-6 sm:p-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-5">
              <ScoreRing score={score} />
              <div>
                <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Overall Score</div>
                <div className={`mt-2 text-5xl font-display font-bold ${scoreTone}`}>{score}%</div>
              </div>
            </div>

            <div className="grid w-full max-w-md grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/5 bg-success-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-success-300">{report.strongAreas.length}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Strong</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-warning-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-warning-300">{report.weakAreas.length}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Weak</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-violet-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-violet-300">{report.misconceptions.length}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Clarified</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="glass-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success-400" />
              <h2 className="text-lg font-semibold text-white">Strong Concepts</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.strongAreas.length > 0 ? (
                report.strongAreas.map((concept) => (
                  <span key={concept} className="rounded-full border border-success-400/30 bg-success-500/10 px-3 py-1.5 text-sm text-success-200">
                    {concept}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">No strong concepts detected yet. Keep learning and revisit the lesson.</span>
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-error-400" />
              <h2 className="text-lg font-semibold text-white">Weak Concepts</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.weakAreas.length > 0 ? (
                report.weakAreas.map((concept) => (
                  <span key={concept} className="rounded-full border border-error-400/30 bg-error-500/10 px-3 py-1.5 text-sm text-error-200">
                    {concept}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">Great work — no major gaps identified.</span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="glass-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning-400" />
              <h2 className="text-lg font-semibold text-white">AI Revision Strategies</h2>
            </div>

            <div className="space-y-3">
              {report.recommendedRevision.length > 0 ? (
                report.recommendedRevision.map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-xl border border-white/5 bg-ink-900/30 p-3 text-sm text-slate-300">
                    <div className="mb-1 flex items-center gap-2 text-warning-300">
                      <Sparkles className="h-4 w-4" />
                      Suggested revision
                    </div>
                    {item}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/5 bg-ink-900/30 p-3 text-sm text-slate-400">
                  Review the lesson concept map and retake a quick concept check to reinforce the idea.
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-violet-300" />
              <h2 className="text-lg font-semibold text-white">Next Topic</h2>
            </div>

            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-violet-200">
                <BookOpen className="h-4 w-4" />
                Recommended next lesson
              </div>
              <div className="text-xl font-semibold text-white">{report.suggestedNextTopic}</div>
              <p className="mt-2 text-sm text-slate-300">
                Focus on this topic next to reinforce the concepts that need extra practice before your next quiz.
              </p>
            </div>
          </div>
        </div>

        {report.misconceptions.length > 0 && (
          <div className="glass-card mb-6 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-violet-300" />
              <h2 className="text-lg font-semibold text-white">Misconception Clarification</h2>
            </div>

            <div className="space-y-4">
              {report.misconceptions.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/5 bg-ink-900/30 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="font-semibold text-violet-200">{item.conceptName}</div>
                    <span className="rounded-full border border-warning-400/25 bg-warning-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-warning-200">
                      Missed concept
                    </span>
                  </div>

                  <p className="mb-3 text-sm text-slate-300">
                    <span className="font-medium text-white">What went wrong:</span> {item.description}
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                      <div className="mb-1 text-xs uppercase tracking-[0.2em] text-cyan-300">Clear explanation</div>
                      <p className="text-sm text-slate-300">{item.alternativeExplanation}</p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                      <div className="mb-1 text-xs uppercase tracking-[0.2em] text-cyan-300">Quick analogy</div>
                      <p className="text-sm text-slate-300">{item.analogy}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-success-400/20 bg-success-500/5 p-3 text-sm text-slate-200">
                    <span className="font-medium text-success-300">Simpler example:</span> {item.simplerExample}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(assessmentResult?.answers.length || 0) > 0 && (
          <div className="glass-card mb-6 p-6">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-semibold text-white">Quiz Answer Review</h2>
            </div>
            <div className="space-y-3">
              {assessmentResult?.answers.map((answer, index) => (
                <div key={answer.questionId} className={`rounded-xl border p-4 ${answer.isCorrect ? 'border-success-400/20 bg-success-500/5' : 'border-error-400/20 bg-error-500/5'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-white">{index + 1}. {answer.question || 'Assessment question'}</p>
                    <span className={`shrink-0 text-xs font-semibold ${answer.isCorrect ? 'text-success-300' : 'text-error-300'}`}>{answer.isCorrect ? 'Correct' : 'Review'}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300"><span className="font-medium text-slate-400">Your answer:</span> {answer.response || 'No answer'}</p>
                  {!answer.isCorrect && <p className="mt-1 text-sm text-slate-300"><span className="font-medium text-cyan-300">Expected:</span> {answer.expectedAnswer}</p>}
                  <p className="mt-2 text-sm text-slate-300"><span className="font-medium text-violet-200">Analysis:</span> {answer.feedback}</p>
                  <div className="mt-3 rounded-lg border border-white/5 bg-ink-950/40 p-3 text-sm text-slate-200"><span className="font-medium text-warning-300">Solution:</span> {answer.solution}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
          <button onClick={() => navigate('/classroom')} className="btn-secondary flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Back to Classroom
          </button>
          <button onClick={() => navigate('/progress')} className="btn-primary flex items-center gap-2">
            View Full Progress
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
