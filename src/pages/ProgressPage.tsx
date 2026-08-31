import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  BarChart3, TrendingUp, Clock, Award, BookOpen, Target, Brain,
} from 'lucide-react';
import type { ProgressEntry, SubjectType } from '@/models';

const subjectColors: Record<SubjectType, string> = {
  Mathematics: '#8b5cf6',
  Physics: '#06b6d4',
  Biology: '#22c55e',
  History: '#f59e0b',
  Programming: '#a78bfa',
  General: '#64748b',
};

export default function ProgressPage() {
  const navigate = useNavigate();
  const { student, progressEntries, progress, refreshProgress } = useApp();
  const [entries, setEntries] = useState<ProgressEntry[]>(progressEntries);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) {
      navigate('/setup');
      return;
    }
    refreshProgress().finally(() => setLoading(false));
  }, [student, navigate, refreshProgress]);

  useEffect(() => {
    setEntries(progressEntries);
  }, [progressEntries]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500/30 border-t-violet-400 animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-5xl mx-auto relative z-10">
          <h1 className="font-display text-3xl font-bold text-white mb-1">Your Progress</h1>
          <div className="glass-card p-8 mt-8 text-center">
            <BookOpen className="w-10 h-10 text-cyan-300 mx-auto mb-4" />
            <p className="text-slate-300">No learning activity recorded yet. Complete your first lesson to track progress!</p>
          </div>
        </div>
      </div>
    );
  }

  const avgScore = progress?.averageScore || 0;
  const totalMinutes = progress?.totalLearningMinutes || 0;
  const totalConcepts = progress?.masteredConcepts.length || entries[entries.length - 1]?.conceptsMastered || 0;

  // Subject distribution
  const subjectCounts: Record<string, number> = {};
  entries.forEach((e) => {
    subjectCounts[e.subject] = (subjectCounts[e.subject] || 0) + 1;
  });

  const weakAreas = progress?.weakConcepts || [];

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-white mb-1">Your Progress</h1>
          <p className="text-slate-400">Track your learning journey over time</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Award} label="Avg Score" value={`${avgScore}%`} color="violet" />
          <StatCard icon={Brain} label="Concepts Mastered" value={totalConcepts} color="cyan" />
          <StatCard icon={Clock} label="Total Hours" value={`${Math.floor(totalMinutes / 60)}h`} color="success" />
          <StatCard icon={BookOpen} label="Sessions" value={entries.length} color="warning" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score over time */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-violet-300" />
              <h3 className="font-semibold text-white">Scores Over Time</h3>
            </div>
            <LineChart entries={entries} />
          </div>

          {/* Concepts mastered */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-cyan-300" />
              <h3 className="font-semibold text-white">Concepts Mastered</h3>
            </div>
            <BarChart entries={entries} dataKey="conceptsMastered" color="#22d3ee" max={totalConcepts + 5} />
          </div>

          {/* Learning hours */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-success-400" />
              <h3 className="font-semibold text-white">Learning Hours</h3>
            </div>
            <BarChart entries={entries} dataKey="learningMinutes" color="#22c55e" max={60} />
          </div>

          {/* Subject distribution */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-violet-300" />
              <h3 className="font-semibold text-white">Subject Distribution</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(subjectCounts).map(([subject, count]) => (
                <div key={subject}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-300">{subject}</span>
                    <span className="text-slate-400">{count} sessions</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-ink-700/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(count / entries.length) * 100}%`, backgroundColor: subjectColors[subject as SubjectType] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weak areas */}
        <div className="glass-card p-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-error-400" />
            <h3 className="font-semibold text-white">Weak Areas</h3>
          </div>
          <div className="space-y-3">
            {weakAreas.length > 0 ? weakAreas.map((area) => (
              <div key={area} className="flex items-center gap-4">
                <span className="text-sm text-slate-300">{area}</span>
              </div>
            )) : <p className="text-sm text-slate-500">No weak areas recorded yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Award; label: string; value: string | number; color: string }) {
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

function LineChart({ entries }: { entries: ProgressEntry[] }) {
  const w = 320;
  const h = 140;
  const padding = 15;
  const step = (w - padding * 2) / Math.max(1, entries.length - 1);
  const points = entries.map((e, i) => `${padding + i * step},${h - padding - (e.score / 100) * (h - padding * 2)}`).join(' ');
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
          </linearGradient>
        </defs>
        <polygon points={`${padding},${h - padding} ${points} ${w - padding},${h - padding}`} fill="url(#lineGrad)" />
        <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinejoin="round" />
        {entries.map((e, i) => (
          <g key={i}>
            <circle cx={padding + i * step} cy={h - padding - (e.score / 100) * (h - padding * 2)} r="4" fill="#22d3ee" />
            <text x={padding + i * step} y={h - padding - (e.score / 100) * (h - padding * 2) - 8} textAnchor="middle" className="fill-slate-400 text-[8px]">
              {e.score}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{new Date(entries[0].date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(entries[entries.length - 1].date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

function BarChart({ entries, dataKey, color, max }: { entries: ProgressEntry[]; dataKey: 'conceptsMastered' | 'learningMinutes'; color: string; max: number }) {
  const w = 320;
  const h = 140;
  const padding = 15;
  const barW = (w - padding * 2) / entries.length - 4;
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36">
        {entries.map((e, i) => {
          const val = e[dataKey];
          const barH = (val / max) * (h - padding * 2);
          const x = padding + i * (barW + 4);
          const y = h - padding - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx="3" fill={color} opacity="0.8" />
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" className="fill-slate-400 text-[7px]">
                {val}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{new Date(entries[0].date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(entries[entries.length - 1].date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}
