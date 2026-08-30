import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  User, GraduationCap, Languages, Target, Palette, Layers, Clock,
  BookOpen, Award, Flame, Edit3, ArrowRight, CheckCircle2,
} from 'lucide-react';

const mockHistory = [
  { title: 'Newton\'s Laws of Motion', subject: 'Physics', score: 85, date: '2026-08-28' },
  { title: 'Linear Equations', subject: 'Mathematics', score: 92, date: '2026-08-25' },
  { title: 'Python Fundamentals', subject: 'Programming', score: 78, date: '2026-08-22' },
  { title: 'Cell Structure', subject: 'Biology', score: 88, date: '2026-08-20' },
  { title: 'World War I Overview', subject: 'History', score: 75, date: '2026-08-18' },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { student, dashboardStats } = useApp();

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card p-8 text-center max-w-md">
          <User className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No profile yet</h2>
          <p className="text-slate-400 mb-6">Set up your student profile to start learning.</p>
          <button onClick={() => navigate('/setup')} className="btn-primary flex items-center gap-2 mx-auto">
            <GraduationCap className="w-4 h-4" />
            Set Up Profile
          </button>
        </div>
      </div>
    );
  }

  const prefs = [
    { icon: GraduationCap, label: 'Level', value: student.level },
    { icon: Languages, label: 'Language', value: student.language },
    { icon: Target, label: 'Goal', value: student.goal },
    { icon: Palette, label: 'Teaching Style', value: student.teachingStyle },
    { icon: Layers, label: 'Depth', value: student.depth },
    { icon: Clock, label: 'Available Time', value: student.availableTime === 7 ? '7 days' : `${student.availableTime} min` },
  ];

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Profile header */}
        <div className="glass-card p-8 mb-6 text-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 text-4xl font-display font-bold text-white">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="font-display text-2xl font-bold text-white">{student.name}</h1>
          <p className="text-slate-400 text-sm mt-1">Student since {new Date(student.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</p>
          <button onClick={() => navigate('/setup')} className="btn-ghost mt-4 inline-flex items-center gap-2 text-sm">
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        {/* Quick stats */}
        {dashboardStats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-4 text-center">
              <BookOpen className="w-5 h-5 text-violet-300 mx-auto mb-2" />
              <div className="text-xl font-display font-bold text-white">{dashboardStats.lessonsCompleted}</div>
              <div className="text-xs text-slate-400">Lessons</div>
            </div>
            <div className="glass-card p-4 text-center">
              <Award className="w-5 h-5 text-success-400 mx-auto mb-2" />
              <div className="text-xl font-display font-bold text-white">{dashboardStats.averageScore}%</div>
              <div className="text-xs text-slate-400">Avg Score</div>
            </div>
            <div className="glass-card p-4 text-center">
              <Flame className="w-5 h-5 text-warning-400 mx-auto mb-2" />
              <div className="text-xl font-display font-bold text-white">{dashboardStats.streak}</div>
              <div className="text-xs text-slate-400">Day Streak</div>
            </div>
          </div>
        )}

        {/* Preferences */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-display text-lg font-semibold text-white mb-4">Learning Preferences</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prefs.map((p) => (
              <div key={p.label} className="flex items-center gap-3 p-3 rounded-xl bg-ink-900/40 border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                  <p.icon className="w-5 h-5 text-violet-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">{p.label}</div>
                  <div className="text-sm font-medium text-white truncate">{p.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Learning history */}
        <div className="glass-card p-6">
          <h2 className="font-display text-lg font-semibold text-white mb-4">Learning History</h2>
          <div className="space-y-3">
            {mockHistory.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-ink-900/40 border border-white/5 hover:border-violet-500/20 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-violet-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{h.title}</div>
                    <div className="text-xs text-slate-400">{h.subject} · {new Date(h.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-bold ${h.score >= 80 ? 'text-success-400' : h.score >= 60 ? 'text-warning-400' : 'text-error-400'}`}>
                    {h.score}%
                  </span>
                  {h.score >= 80 && <CheckCircle2 className="w-4 h-4 text-success-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <button onClick={() => navigate('/learn')} className="btn-primary inline-flex items-center gap-2">
            Start a New Lesson
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
