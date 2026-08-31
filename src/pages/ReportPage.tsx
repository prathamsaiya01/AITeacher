import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { generateLearningReport } from '@/services/aiService';
import {
  Trophy, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, BookOpen,
  ArrowRight, RotateCcw, Sparkles, Target, Lightbulb, Brain,
} from 'lucide-react';
import type { LearningReport } from '@/models';

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
        const r = await generateLearningReport(lesson, assessmentResult);
        if (!cancelled) {
          setReport(r);
          setLearningReport(r);
          refreshData();
        }
      } catch (error) {
        console.error('Failed to generate learning report:', error);
        if (!cancelled) setError('Unable to generate your learning report. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [lesson, assessmentResult, navigate, setLearningReport, refreshData]);

  if (loading || !report || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {error ? (
            <>
              <p role="alert" className="text-center text-error-300">{error}</p>
              <button onClick={() => navigate('/assessment')} className="btn-secondary">Back to Assessment</button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full border-4 border-violet-500/30 border-t-violet-400 animate-spin" />
              <p className="text-slate-400">Generating your learning report...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const scoreColor = report.score >= 80 ? 'text-success-400' : report.score >= 60 ? 'text-warning-400' : 'text-error-400';
  const scoreBg = report.score >= 80 ? 'from-success-500/20 to-success-500/5' : report.score >= 60 ? 'from-warning-500/20 to-warning-500/5' : 'from-error-500/20 to-error-500/5';

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4">
            <Trophy className="w-4 h-4 text-warning-400" />
            <span className="text-sm text-slate-300">Learning Report</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">{lesson.title}</h1>
          <p className="text-slate-400">{report.summary}</p>
        </div>

        {/* Score */}
        <div className={`glass-card p-8 mb-6 bg-gradient-to-br ${scoreBg}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-sm text-slate-400 mb-1">Your Score</div>
              <div className={`text-6xl font-display font-bold ${scoreColor}`}>{report.score}%</div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-success-400">{report.strongAreas.length}</div>
                <div className="text-xs text-slate-400">Strong</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-error-400">{report.weakAreas.length}</div>
                <div className="text-xs text-slate-400">Needs Work</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Strong areas */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-success-400" />
              <h3 className="font-semibold text-white">Strong Areas</h3>
            </div>
            {report.strongAreas.length > 0 ? (
              <div className="space-y-2">
                {report.strongAreas.map((a) => (
                  <div key={a} className="flex items-center gap-2 p-2 rounded-lg bg-success-500/10">
                    <CheckCircle2 className="w-4 h-4 text-success-400 flex-shrink-0" />
                    <span className="text-sm text-slate-200">{a}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Keep practicing to build strength!</p>
            )}
          </div>

          {/* Weak areas */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-error-400" />
              <h3 className="font-semibold text-white">Needs Work</h3>
            </div>
            {report.weakAreas.length > 0 ? (
              <div className="space-y-2">
                {report.weakAreas.map((a) => (
                  <div key={a} className="flex items-center gap-2 p-2 rounded-lg bg-error-500/10">
                    <AlertCircle className="w-4 h-4 text-error-400 flex-shrink-0" />
                    <span className="text-sm text-slate-200">{a}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-success-400">No weak areas detected!</p>
            )}
          </div>
        </div>

        {/* Misconceptions */}
        {report.misconceptions.length > 0 && (
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-violet-300" />
              <h3 className="font-semibold text-white">Misconceptions Detected</h3>
            </div>
            <div className="space-y-3">
              {report.misconceptions.map((m) => (
                <div key={m.id} className="p-4 rounded-xl bg-ink-900/40 border border-white/5">
                  <div className="font-medium text-violet-300 mb-1">{m.conceptName}</div>
                  <p className="text-sm text-slate-400 mb-2">{m.description}</p>
                  <div className="text-sm text-slate-300">
                    <span className="text-cyan-300 font-medium">Fix: </span>
                    {m.alternativeExplanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw className="w-5 h-5 text-warning-400" />
              <h3 className="font-semibold text-white">Recommended Revision</h3>
            </div>
            <div className="space-y-2">
              {report.recommendedRevision.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-warning-400 mt-0.5">•</span>
                  {r}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 bg-gradient-to-br from-violet-500/10 to-cyan-500/5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-violet-300" />
              <h3 className="font-semibold text-white">Suggested Next Topic</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-300" />
              </div>
              <div>
                <div className="font-semibold text-white">{report.suggestedNextTopic}</div>
                <div className="text-xs text-slate-400">Recommended by AI</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={() => navigate('/learn')} className="btn-secondary flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Learn Again
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-primary flex items-center gap-2">
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
