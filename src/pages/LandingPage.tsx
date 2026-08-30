import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Brain,
  Eye,
  ClipboardList,
  MessageSquare,
  Repeat,
  Trophy,
  FileText,
  UserCog,
  Video,
  Languages,
  LineChart,
  Zap,
} from 'lucide-react';

const steps = [
  { icon: Eye, label: 'Understand', desc: 'AI reads your material & gauges your level' },
  { icon: ClipboardList, label: 'Plan', desc: 'A personalized lesson timeline is built' },
  { icon: Video, label: 'Teach', desc: 'An AI teacher explains concepts with visuals' },
  { icon: MessageSquare, label: 'Question', desc: 'Adaptive questions check your understanding' },
  { icon: Repeat, label: 'Adapt', desc: 'Difficulty shifts based on your answers' },
  { icon: Trophy, label: 'Master', desc: 'Assess, report, and advance to the next topic' },
];

const features = [
  { icon: FileText, title: 'PDF Learning', desc: 'Upload PDFs, DOCX, PPTX, or notes — the AI extracts and understands the content, then builds a lesson from your material.' },
  { icon: UserCog, title: 'Personalization', desc: 'Your level, language, goal, and teaching style shape every lesson. No two students get the same experience.' },
  { icon: Video, title: 'AI Teaching Video', desc: 'A human-like AI teacher delivers concepts with voice, visuals, and subject-specific diagrams — not just text.' },
  { icon: Languages, title: 'Multilingual Teaching', desc: 'Learn in English, Hindi, or Hinglish. The AI teacher switches languages seamlessly to match your preference.' },
  { icon: Zap, title: 'Adaptive Learning', desc: 'Get a question right and it goes deeper. Get it wrong and it re-explains with analogies and simpler examples.' },
  { icon: LineChart, title: 'Analytics', desc: 'Track scores, concepts mastered, learning hours, and weak areas with beautiful, actionable charts.' },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        {/* Background glows */}
        <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-fade-in-down">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-slate-300">Powered by Gemini · RAG · AI Video</span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 animate-fade-in-up text-balance">
            Meet your <span className="gradient-text">AI Teacher</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Not a chatbot. An AI that actually <span className="text-violet-300 font-semibold">teaches</span> —
            it understands your material, plans a lesson, teaches with voice and visuals,
            asks adaptive questions, and guides you to mastery.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/setup" className="btn-primary flex items-center gap-2 text-lg px-8 py-4">
              <Brain className="w-5 h-5" />
              Start Learning
            </Link>
            <Link to="/dashboard" className="btn-secondary flex items-center gap-2 text-lg px-8 py-4">
              View Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-slate-600 flex items-start justify-center p-1.5">
            <div className="w-1 h-2 rounded-full bg-violet-400" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white text-center mb-4">
            Understand → Plan → Teach → Question → Adapt → Master
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
            A complete learning loop that mirrors how the best human teachers work —
            but personalized to you, available 24/7, and in your language.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div
                key={step.label}
                className="glass-card p-6 hover:border-violet-500/30 transition-all duration-300 group animate-fade-in-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <step.icon className="w-6 h-6 text-violet-300" />
                  </div>
                  <span className="text-3xl font-display font-bold text-white/10">0{i + 1}</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.label}</h3>
                <p className="text-slate-400 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white text-center mb-4">
            Built for real learning
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
            Every feature is designed around one goal: helping you actually understand, not just consume content.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="glass-card p-6 hover:border-cyan-500/30 transition-all duration-300 group animate-scale-in"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-cyan-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card p-12 gradient-border">
            <Brain className="w-16 h-16 text-violet-400 mx-auto mb-6 animate-pulse-glow rounded-full" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to learn with your AI Teacher?
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Set up your profile, pick a topic or upload your material, and start your first lesson in minutes.
            </p>
            <Link to="/setup" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4">
              <Sparkles className="w-5 h-5" />
              Start Learning
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto text-center text-sm text-slate-500">
          AI Teacher — Built for the AI Hackathon. Gemini · RAG · AI Video · Adaptive Learning.
        </div>
      </footer>
    </div>
  );
}
