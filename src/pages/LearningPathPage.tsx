import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  CheckCircle2, Lock, Play, Circle, Sparkles, ChevronRight, Clock,
  BookOpen, ArrowRight, Target,
} from 'lucide-react';
import type { LearningPath as LP, LearningPathNode, SubjectType } from '@/models';

const subjectColors: Record<SubjectType, string> = {
  Mathematics: 'from-violet-500 to-purple-500',
  Physics: 'from-cyan-500 to-blue-500',
  Biology: 'from-success-500 to-emerald-500',
  History: 'from-warning-500 to-orange-500',
  Programming: 'from-violet-500 to-cyan-500',
  General: 'from-slate-500 to-slate-400',
};

export default function LearningPathPage() {
  const navigate = useNavigate();
  const { student, learningPath, refreshData } = useApp();
  const [path, setPath] = useState<LP | null>(learningPath);
  const [loading, setLoading] = useState(!learningPath);

  useEffect(() => {
    if (!student) {
      navigate('/setup');
      return;
    }
    refreshData().then(() => setLoading(false));
  }, [student, navigate, refreshData]);

  useEffect(() => {
    setPath(learningPath);
  }, [learningPath]);

  if (loading || !path) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500/30 border-t-violet-400 animate-spin" />
      </div>
    );
  }

  const completed = path.nodes.filter((n) => n.status === 'completed').length;
  const total = path.nodes.length;

  if (total === 0) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="font-display text-3xl font-bold text-white mb-1">Your Learning Path</h1>
          <div className="glass-card p-8 mt-8 text-center">
            <BookOpen className="w-10 h-10 text-cyan-300 mx-auto mb-4" />
            <p className="text-slate-300">Your path will appear here after you complete your first lesson assessment.</p>
            <button onClick={() => navigate('/learn')} className="btn-primary mt-5 inline-flex items-center gap-2">
              Start a Lesson
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-white mb-1">Your Learning Path</h1>
          <p className="text-slate-400">{path.title} · {completed} of {total} completed</p>
        </div>

        {/* Overall progress */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Path Progress</span>
            <span className="text-lg font-display font-bold text-white">{Math.round((completed / total) * 100)}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-ink-700/40 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-success-500 transition-all duration-700" style={{ width: `${(completed / total) * 100}%` }} />
          </div>
        </div>

        {/* Path nodes - vertical timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500/50 via-cyan-500/30 to-transparent" />

          <div className="space-y-4">
            {path.nodes.map((node, i) => (
              <PathNode key={node.id} node={node} isLast={i === path.nodes.length - 1} onLearn={() => navigate('/learn')} />
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button onClick={() => navigate('/learn')} className="btn-primary flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Start Another Lesson
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PathNode({ node, onLearn }: { node: LearningPathNode; isLast?: boolean; onLearn: () => void }) {
  const statusConfig = {
    completed: { icon: CheckCircle2, color: 'text-success-400', bg: 'bg-success-500/20', border: 'border-success-500/30' },
    current: { icon: Play, color: 'text-violet-300', bg: 'bg-violet-500/20', border: 'border-violet-500/40' },
    available: { icon: Circle, color: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    locked: { icon: Lock, color: 'text-slate-500', bg: 'bg-ink-700/40', border: 'border-white/5' },
  };
  const config = statusConfig[node.status];
  const Icon = config.icon;
  const gradient = subjectColors[node.subject];

  return (
    <div className="relative pl-16 animate-fade-in-up" style={{ animationDelay: `${node.order * 0.1}s` }}>
      {/* Node circle */}
      <div className={`absolute left-0 top-2 w-12 h-12 rounded-full ${config.bg} border-2 ${config.border} flex items-center justify-center ${node.status === 'current' ? 'animate-pulse-glow' : ''}`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>

      {/* Card */}
      <div className={`glass-card p-5 ${node.status === 'locked' ? 'opacity-50' : 'hover:border-violet-500/20'} transition-all`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${gradient} text-white font-medium`}>
                {node.subject}
              </span>
              {node.recommended && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Recommended
                </span>
              )}
            </div>
            <h3 className="font-semibold text-white">{node.title}</h3>
            <p className="text-sm text-slate-400 mt-1">{node.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {node.estimatedMinutes} min
              </span>
              {node.prerequisites.length > 0 && (
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {node.prerequisites.length} prerequisite{node.prerequisites.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          {(node.status === 'current' || node.status === 'available') && (
            <button onClick={onLearn} className="btn-secondary text-sm flex items-center gap-1 flex-shrink-0">
              {node.status === 'current' ? 'Continue' : 'Start'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
