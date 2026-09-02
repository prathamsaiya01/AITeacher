import type { TeachingVideo } from '@/models';

export type AvatarProvider = 'browser' | 'heygen' | 'did';
export type AvatarState = 'idle' | 'speaking' | 'thinking';

export interface AvatarSession {
  id: string;
  provider: AvatarProvider;
  isTalking: boolean;
  state: AvatarState;
  streamUrl?: string;
  status: 'idle' | 'ready' | 'streaming' | 'stopped';
}

export interface AvatarService {
  initializeAvatarSession(provider?: AvatarProvider): Promise<AvatarSession>;
  streamAvatarVideo(): Promise<AvatarSession>;
  stopAvatarSession(): void;
  setTalking(isTalking: boolean): void;
  setState(state: AvatarState): void;
  getState(): AvatarState;
  getSession(): AvatarSession;
  subscribe(listener: (session: AvatarSession) => void): () => void;
}

class ModularAvatarService implements AvatarService {
  private session: AvatarSession = { id: 'fallback-avatar', provider: 'browser', isTalking: false, state: 'idle', status: 'idle' };
  private listeners = new Set<(session: AvatarSession) => void>();

  private publish(): void {
    this.listeners.forEach((listener) => listener(this.session));
  }

  async initializeAvatarSession(provider: AvatarProvider = 'browser'): Promise<AvatarSession> {
    // The browser provider deliberately has no network dependency: the UI renders an animated canvas fallback.
    this.session = { id: `avatar-${Date.now()}`, provider, isTalking: false, state: 'idle', status: 'ready' };
    this.publish();
    return this.session;
  }

  async streamAvatarVideo(): Promise<AvatarSession> {
    this.session = { ...this.session, status: 'streaming' };
    this.publish();
    return this.session;
  }

  stopAvatarSession(): void {
    this.session = { ...this.session, isTalking: false, state: 'idle', status: 'stopped' };
    this.publish();
  }

  setTalking(isTalking: boolean): void {
    this.session = { ...this.session, isTalking, state: isTalking ? 'speaking' : 'idle' };
    this.publish();
  }

  setState(state: AvatarState): void {
    this.session = { ...this.session, state, isTalking: state === 'speaking' };
    this.publish();
  }

  getState(): AvatarState {
    return this.session.state;
  }

  getSession(): AvatarSession {
    return this.session;
  }

  subscribe(listener: (session: AvatarSession) => void): () => void {
    this.listeners.add(listener);
    listener(this.session);
    return () => this.listeners.delete(listener);
  }
}

export const avatarService: AvatarService = new ModularAvatarService();
export const initializeAvatarSession = (provider?: AvatarProvider) => avatarService.initializeAvatarSession(provider);
export const streamAvatarVideo = () => avatarService.streamAvatarVideo();
export const stopAvatarSession = () => avatarService.stopAvatarSession();
export const setAvatarTalking = (isTalking: boolean) => avatarService.setTalking(isTalking);
export const setAvatarState = (state: AvatarState) => avatarService.setState(state);
export const getAvatarState = () => avatarService.getState();

/** Provider-neutral contract; a HeyGen or D-ID adapter can replace this implementation later. */
export async function generateTeachingVideo(
  conceptName: string,
  language: string,
  persona: string
): Promise<TeachingVideo> {
  return {
    id: `teaching-video-${Date.now()}`,
    url: '',
    durationSeconds: 0,
    status: 'ready',
    transcript: `${persona} is ready to teach ${conceptName} in ${language}.`,
  };
}
