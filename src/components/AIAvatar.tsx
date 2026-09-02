import { useState } from 'react';
import { Brain, LoaderCircle, Volume2 } from 'lucide-react';

interface AIAvatarProps {
  avatarUrl?: string;
  isSpeaking: boolean;
  transcript?: string;
  personaName: string;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AI';
}

export default function AIAvatar({ avatarUrl, isSpeaking, transcript, personaName }: AIAvatarProps) {
  const [streamFailed, setStreamFailed] = useState(false);
  const initials = getInitials(personaName);

  return (
    <div className="flex w-full items-start gap-4" aria-live="polite">
      <div className="flex shrink-0 flex-col items-center">
        <div className={`relative h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-950/30 ${isSpeaking ? 'animate-pulse-glow' : ''}`}>
          {avatarUrl && !streamFailed ? (
            <video
              className="h-full w-full object-cover"
              src={avatarUrl}
              autoPlay
              muted
              loop
              playsInline
              onError={() => setStreamFailed(true)}
              aria-label={`${personaName} avatar`}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-ink-950/30 text-white">
              <Brain className="h-7 w-7" aria-hidden="true" />
              <span className="mt-1 text-xs font-bold tracking-widest">{initials}</span>
            </div>
          )}
          <span className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ${isSpeaking ? 'bg-success-300 animate-ping' : 'bg-white/50'}`} />
        </div>
        <div className="mt-2 text-center text-xs text-slate-400">{personaName}</div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex min-h-5 items-center gap-2 text-xs font-medium text-cyan-200">
          {isSpeaking ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <LoaderCircle className="h-4 w-4 text-slate-500" aria-hidden="true" />}
          <span>{isSpeaking ? 'Speaking' : avatarUrl && !streamFailed ? 'Avatar ready' : 'Avatar fallback ready'}</span>
          {isSpeaking && (
            <span className="ml-1 flex items-end gap-0.5" aria-label="Voice active">
              {[0, 1, 2, 3, 4].map((bar) => <span key={bar} className="w-1 rounded-full bg-cyan-300 animate-wave" style={{ height: `${8 + (bar % 3) * 4}px`, animationDelay: `${bar * 0.08}s` }} />)}
            </span>
          )}
        </div>
        <p className="leading-relaxed text-slate-200">{transcript || 'Your AI Teacher is ready when you are.'}</p>
      </div>
    </div>
  );
}