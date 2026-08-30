import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ArrowRight, ArrowLeft, Check, Clock, GraduationCap, Target, Palette, Layers, Languages } from 'lucide-react';
import type { Level, Language, TeachingStyle, Depth, TimeOption } from '@/models';

const levels: { value: Level; desc: string }[] = [
  { value: 'Beginner', desc: 'New to the subject' },
  { value: 'Intermediate', desc: 'Some familiarity' },
  { value: 'Advanced', desc: 'Deep knowledge' },
];

const languages: { value: Language; flag: string }[] = [
  { value: 'English', flag: 'EN' },
  { value: 'Hindi', flag: 'HI' },
  { value: 'Hinglish', flag: 'HG' },
];

const styles: { value: TeachingStyle; desc: string }[] = [
  { value: 'Socratic', desc: 'Learn through guided questions' },
  { value: 'Direct', desc: 'Clear, straightforward explanations' },
  { value: 'Storytelling', desc: 'Concepts woven into narratives' },
  { value: 'Visual', desc: 'Diagrams and visual aids first' },
];

const depths: { value: Depth; desc: string }[] = [
  { value: 'Overview', desc: 'Key ideas only' },
  { value: 'Standard', desc: 'Balanced depth' },
  { value: 'Deep Dive', desc: 'Comprehensive coverage' },
];

const times: { value: TimeOption; label: string; desc: string }[] = [
  { value: 5, label: '5 min', desc: 'Quick concept' },
  { value: 20, label: '20 min', desc: 'Short session' },
  { value: 30, label: '30 min', desc: 'Full lesson' },
  { value: 60, label: '60 min', desc: 'Deep study' },
  { value: 7, label: '7 days', desc: 'Multi-day plan' },
];

export default function StudentSetupPage() {
  const navigate = useNavigate();
  const { setStudent } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<Level | null>(null);
  const [language, setLanguage] = useState<Language | null>(null);
  const [goal, setGoal] = useState('');
  const [style, setStyle] = useState<TeachingStyle | null>(null);
  const [depth, setDepth] = useState<Depth | null>(null);
  const [time, setTime] = useState<TimeOption | null>(null);

  const steps = ['Name', 'Level', 'Language', 'Goal', 'Style', 'Depth', 'Time'];
  const canProceed = [
    name.trim().length > 0,
    !!level,
    !!language,
    goal.trim().length > 0,
    !!style,
    !!depth,
    !!time,
  ];

  const handleFinish = () => {
    if (!level || !language || !style || !depth || !time) return;
    const student = {
      id: `student_${Date.now()}`,
      name: name.trim(),
      level,
      language,
      goal: goal.trim(),
      teachingStyle: style,
      depth,
      availableTime: time,
      createdAt: new Date().toISOString(),
    };
    setStudent(student);
    navigate('/learn');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step
                    ? 'bg-success-500 text-white'
                    : i === step
                    ? 'bg-violet-500 text-white animate-pulse-glow'
                    : 'bg-ink-700 text-slate-500'
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${i < step ? 'bg-success-500' : 'bg-ink-700'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="glass-card p-8 animate-fade-in-up" key={step}>
          {step === 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-white">Welcome!</h2>
                  <p className="text-slate-400 text-sm">What should your AI Teacher call you?</p>
                </div>
              </div>
              <input
                className="input-field text-lg"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && canProceed[0] && setStep(1)}
              />
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">Your level</h2>
              <p className="text-slate-400 text-sm mb-6">How familiar are you with this subject?</p>
              <div className="space-y-3">
                {levels.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      level === l.value
                        ? 'border-violet-400/50 bg-violet-500/10'
                        : 'border-white/5 bg-ink-900/40 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{l.value}</div>
                        <div className="text-sm text-slate-400">{l.desc}</div>
                      </div>
                      {level === l.value && <Check className="w-5 h-5 text-violet-400" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">Preferred language</h2>
              <p className="text-slate-400 text-sm mb-6 flex items-center gap-2">
                <Languages className="w-4 h-4" /> Your AI Teacher will teach in this language.
              </p>
              <div className="grid grid-cols-3 gap-4">
                {languages.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLanguage(l.value)}
                    className={`p-6 rounded-xl border text-center transition-all ${
                      language === l.value
                        ? 'border-violet-400/50 bg-violet-500/10 scale-105'
                        : 'border-white/5 bg-ink-900/40 hover:border-white/10'
                    }`}
                  >
                    <div className="text-3xl font-display font-bold gradient-text mb-2">{l.flag}</div>
                    <div className="text-sm text-slate-300">{l.value}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">Your learning goal</h2>
              <p className="text-slate-400 text-sm mb-6 flex items-center gap-2">
                <Target className="w-4 h-4" /> What do you want to achieve?
              </p>
              <textarea
                className="input-field min-h-[100px] resize-none"
                placeholder="e.g. I want to understand Newton's laws well enough to solve physics problems..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                autoFocus
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {['Pass an exam', 'Build a project', 'Understand fundamentals', 'Career growth'].map((s) => (
                  <button key={s} onClick={() => setGoal(s)} className="chip chip-inactive text-xs">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">Teaching style</h2>
              <p className="text-slate-400 text-sm mb-6 flex items-center gap-2">
                <Palette className="w-4 h-4" /> How should your AI Teacher explain things?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {styles.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      style === s.value
                        ? 'border-violet-400/50 bg-violet-500/10'
                        : 'border-white/5 bg-ink-900/40 hover:border-white/10'
                    }`}
                  >
                    <div className="font-semibold text-white">{s.value}</div>
                    <div className="text-sm text-slate-400">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">Desired depth</h2>
              <p className="text-slate-400 text-sm mb-6 flex items-center gap-2">
                <Layers className="w-4 h-4" /> How deep should the lessons go?
              </p>
              <div className="space-y-3">
                {depths.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDepth(d.value)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      depth === d.value
                        ? 'border-violet-400/50 bg-violet-500/10'
                        : 'border-white/5 bg-ink-900/40 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{d.value}</div>
                        <div className="text-sm text-slate-400">{d.desc}</div>
                      </div>
                      {depth === d.value && <Check className="w-5 h-5 text-violet-400" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">Available time</h2>
              <p className="text-slate-400 text-sm mb-6 flex items-center gap-2">
                <Clock className="w-4 h-4" /> How much time do you have per session?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {times.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTime(t.value)}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      time === t.value
                        ? 'border-violet-400/50 bg-violet-500/10 scale-105'
                        : 'border-white/5 bg-ink-900/40 hover:border-white/10'
                    }`}
                  >
                    <div className="text-lg font-display font-bold text-white">{t.label}</div>
                    <div className="text-xs text-slate-400">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="btn-ghost flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            {step < 6 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed[step]}
                className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!canProceed[step]}
                className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <GraduationCap className="w-4 h-4" />
                Start Learning
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
