import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { generateLesson } from '@/services/aiService';
import { Check, Loader2, ArrowRight, Clock, BookOpen, ListChecks, Image, HelpCircle, Lightbulb } from 'lucide-react';
import type { Lesson } from '@/models';

const processingSteps = [
  { icon: BookOpen, label: 'Understanding material', desc: 'Reading and extracting key concepts from your material' },
  { icon: Lightbulb, label: 'Analyzing student level', desc: 'Adapting to your level, language, and learning style' },
  { icon: ListChecks, label: 'Selecting concepts', desc: 'Choosing the most important concepts for your goal' },
  { icon: Lightbulb, label: 'Creating examples', desc: 'Building real-world examples tailored to you' },
  { icon: HelpCircle, label: 'Planning questions', desc: 'Designing adaptive questions for each concept' },
  { icon: Image, label: 'Preparing visuals', desc: 'Generating subject-specific diagrams and visuals' },
];

export default function LessonPlannerPage() {
  const navigate = useNavigate();
  const { student, topic, uploadedDoc, setLesson } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [lesson, setLocalLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    if (!student || (!topic && !uploadedDoc)) {
      navigate('/learn');
      return;
    }
    let cancelled = false;
    const run = async () => {
      const lessonData = await generateLesson(
        student!,
        topic || uploadedDoc?.fileName || 'General Topic',
        uploadedDoc || undefined,
        { availableTime: `${student!.availableTime} ${student!.availableTime === 1 || student!.availableTime === 3 || student!.availableTime === 7 ? 'days' : 'minutes'}` }
      );
      if (!cancelled) setLocalLesson(lessonData);
    };
    run();
    // Step through processing animation
    const interval = setInterval(() => {
      setCurrentStep((s) => {
        if (s >= processingSteps.length - 1) {
          clearInterval(interval);
          return s;
        }
        return s + 1;
      });
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [student, topic, uploadedDoc, navigate]);

  const allDone = currentStep >= processingSteps.length - 1 && lesson !== null;

  const handleStart = () => {
    if (lesson) {
      setLesson(lesson);
      navigate('/classroom');
    }
  };

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">
            AI <span className="gradient-text">Lesson Planner</span>
          </h1>
          <p className="text-slate-400">
            {topic || uploadedDoc?.fileName} · Building a personalized lesson for {student?.name}
          </p>
        </div>

        {/* Processing animation */}
        <div className="glass-card p-8 mb-6">
          <div className="space-y-4">
            {processingSteps.map((step, i) => {
              const done = i < currentStep || allDone;
              const active = i === currentStep && !allDone;
              return (
                <div
                  key={step.label}
                  className={`flex items-center gap-4 transition-all duration-500 ${
                    i <= currentStep || allDone ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      done
                        ? 'bg-success-500/20 text-success-400'
                        : active
                        ? 'bg-violet-500/20 text-violet-300 animate-pulse-glow'
                        : 'bg-ink-700/40 text-slate-500'
                    }`}
                  >
                    {done ? (
                      <Check className="w-5 h-5" />
                    ) : active ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold ${done || active ? 'text-white' : 'text-slate-500'}`}>
                      {step.label}
                    </div>
                    {active && <div className="text-sm text-slate-400">{step.desc}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lesson timeline */}
        {lesson && allDone && (
          <div className="glass-card p-8 animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-white">Your Lesson Timeline</h2>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                {lesson.estimatedMinutes} min
              </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-2">
              {lesson.segments.map((seg, i) => (
                <div
                  key={seg.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-ink-900/40 border border-white/5 animate-fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center text-xs font-bold text-violet-300 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{seg.title}</div>
                    <div className="text-xs text-slate-400">{seg.description}</div>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {seg.durationMin}m
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-ink-900/40 border border-white/5 text-center">
                  <div className="text-2xl font-display font-bold text-white">{lesson.concepts.length}</div>
                  <div className="text-xs text-slate-400">Concepts</div>
                </div>
                <div className="p-3 rounded-xl bg-ink-900/40 border border-white/5 text-center">
                  <div className="text-2xl font-display font-bold text-white">{lesson.segments.length}</div>
                  <div className="text-xs text-slate-400">Segments</div>
                </div>
              </div>
              <button onClick={handleStart} className="btn-primary flex items-center gap-2">
                Enter Classroom
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}