import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  BookOpen, Clock, Award, Flame, TrendingUp, TrendingDown, ArrowRight,
  Sparkles, GraduationCap, BarChart3, Play, ChevronRight, Target,
} from 'lucide-react';
import type { DashboardStats, ProgressEntry } from '@/models';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { student, dashboardStats, progressEntries, refreshData } = useApp();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) {
      navigate('/setup');
      return;
    }
    refreshData().then(() => setLoading(false));
  }, [student, navigate, refreshData]);

  if (loading || !dashboardStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500/30 border-t-violet-400 animate-spin" />
      </div>
    );
  }

  const stats = dashboardStats as DashboardStats;
  const entries = progressEntries as ProgressEntry[];

  if (stats.lessonsCompleted === 0) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-6xl mx-auto relative z-10">
          <h1 className="font-display text-3xl font-bold text-white mb-1">Welcome back, {student?.name}</h1>
          <div className="glass-card p-8 mt-8 text-center">
            <BookOpen className="w-10 h-10 text-cyan-300 mx-auto mb-4" />
            <p className="text-slate-300">No learning activity recorded yet. Complete your first lesson to track progress!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-white mb-1">
            Welcome back, {student?.name}
          </h1>
          <p className="text-slate-400">Here's your learning overview</p>
        </div>

        {/* Continue learning */}
        {stats.continueLearning && (
          <div className="glass-card p-6 mb-6 bg-gradient-to-r from-violet-500/10 to-cyan-500/5 group cursor-pointer" onClick={() => navigate('/classroom')}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Continue Learning</div>
                  <div className="text-xl font-semibold text-white">{stats.continueLearning.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-32 h-2 rounded-full bg-ink-700/40 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${stats.continueLearning.progress}%` }} />
                    </div>
                    <span className="text-xs text-slate-400">{stats.continueLearning.progress}%</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={BookOpen} label="Lessons Completed" value={stats.lessonsCompleted} color="violet" />
          <StatCard icon={Clock} label="Learning Time" value={`${Math.floor(stats.totalLearningMinutes / 60)}h ${stats.totalLearningMinutes % 60}m`} color="cyan" />
          <StatCard icon={Award} label="Average Score" value={`${stats.averageScore}%`} color="success" />
          <StatCard icon={Flame} label="Day Streak" value={stats.streak} color="warning" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score trend */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-violet-300" />
              <h3 className="font-semibold text-white">Score Trend</h3>
            </div>
            <ScoreChart entries={entries} />
          </div>

          {/* Recommended lessons */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-cyan-300" />
              <h3 className="font-semibold text-white">Recommended Lessons</h3>
            </div>
            <div className="space-y-3">
              {stats.recommendedLessons.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between p-3 rounded-xl bg-ink-900/40 border border-white/5 hover:border-violet-500/30 transition-all cursor-pointer group" onClick={() => navigate('/learn')}>
                  <div>
                    <div className="font-medium text-white text-sm">{rec.title}</div>
                    <div className="text-xs text-slate-400">{rec.reason}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>

          {/* Strong concepts */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-success-400" />
              <h3 className="font-semibold text-white">Strong Concepts</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.strongConcepts.map((c) => (
                <span key={c} className="text-sm px-3 py-1.5 rounded-full bg-success-500/15 text-success-400">{c}</span>
              ))}
            </div>
          </div>

          {/* Weak concepts */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-error-400" />
              <h3 className="font-semibold text-white">Weak Concepts</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.weakConcepts.map((c) => (
                <span key={c} className="text-sm px-3 py-1.5 rounded-full bg-error-500/15 text-error-400">{c}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <button onClick={() => navigate('/learn')} className="btn-primary flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            New Lesson
          </button>
          <button onClick={() => navigate('/path')} className="btn-secondary flex items-center gap-2">
            <Target className="w-4 h-4" />
            Learning Path
          </button>
          <button onClick={() => navigate('/progress')} className="btn-secondary flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            View Progress
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof BookOpen; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    violet: 'from-violet-500/20 to-violet-500/5 text-violet-300',
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-300',
    success: 'from-success-500/20 to-success-500/5 text-success-400',
    warning: 'from-warning-500/20 to-warning-500/5 text-warning-400',
  };
  return (
    <div className={`glass-card p-5 bg-gradient-to-br ${colors[color]}`}>
      <Icon className="w-6 h-6 mb-3" />
      <div className="text-2xl font-display font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function ScoreChart({ entries }: { entries: ProgressEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-slate-500">No data yet</p>;
  const max = 100;
  const w = 300;
  const h = 120;
  const padding = 10;
  const step = (w - padding * 2) / Math.max(1, entries.length - 1);
  const points = entries.map((e, i) => `${padding + i * step},${h - padding - (e.score / max) * (h - padding * 2)}`).join(' ');
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32">
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
          </linearGradient>
        </defs>
        <polygon points={`${padding},${h - padding} ${points} ${w - padding},${h - padding}`} fill="url(#scoreGrad)" />
        <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" />
        {entries.map((e, i) => (
          <circle key={i} cx={padding + i * step} cy={h - padding - (e.score / max) * (h - padding * 2)} r="3" fill="#22d3ee" />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{new Date(entries[0].date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(entries[entries.length - 1].date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}
