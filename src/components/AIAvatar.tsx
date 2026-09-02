import { useState } from 'react';
import { Brain, LoaderCircle, Volume2 } from 'lucide-react';
import type { TeacherPersona } from '@/models';
import type { AvatarState } from '@/services/avatarService';

interface AIAvatarProps {
  persona: TeacherPersona;
  state: AvatarState;
  transcript?: string;
  isSpeaking: boolean;
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'AI';
}

export default function AIAvatar({ persona, state, transcript, isSpeaking }: AIAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const speaking = isSpeaking || state === 'speaking';
  const initials = getInitials(persona.name);

  return (
    <div className="flex min-h-[108px] w-full items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-ink-950/20 backdrop-blur-xl" aria-live="polite">
      <div className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-950/30 ${speaking ? 'animate-pulse-glow' : ''}`}>
        {persona.avatarUrl && !imageFailed ? (
          <img className="h-full w-full object-cover" src={persona.avatarUrl} alt={`${persona.name} avatar`} onError={() => setImageFailed(true)} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-ink-950/30 text-white">
            <Brain className="h-7 w-7" aria-hidden="true" />
            <span className="mt-1 text-xs font-bold tracking-widest">{initials}</span>
          </div>
        )}
        <span className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ${speaking ? 'animate-ping bg-success-300' : 'bg-white/50'}`} />
        {speaking && <span className="absolute inset-2 rounded-xl border border-cyan-200/60 shadow-[0_0_22px_rgba(103,232,249,0.65)]" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-white">{persona.name}</span>
          <span className="text-xs text-cyan-200">{persona.title}</span>
        </div>
        <div className="mb-2 mt-1 flex min-h-5 items-center gap-2 text-xs font-medium text-slate-400">
          {state === 'thinking' ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
          <span>{state === 'thinking' ? 'Thinking' : speaking ? 'Speaking' : 'Ready'}</span>
          {speaking && <span className="flex items-end gap-0.5" aria-label="Voice active">{[0, 1, 2, 3, 4].map((bar) => <span key={bar} className="w-1 animate-wave rounded-full bg-cyan-300" style={{ height: `${8 + (bar % 3) * 4}px`, animationDelay: `${bar * 0.08}s` }} />)}</span>}
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-slate-200">{transcript || 'Your AI guide is ready when you are.'}</p>
      </div>
    </div>
  );
}
