export type AvatarProvider = 'browser' | 'heygen' | 'did';

export interface AvatarSession {
  id: string;
  provider: AvatarProvider;
  isTalking: boolean;
  streamUrl?: string;
  status: 'idle' | 'ready' | 'streaming' | 'stopped';
}

export interface AvatarService {
  initializeAvatarSession(provider?: AvatarProvider): Promise<AvatarSession>;
  streamAvatarVideo(): Promise<AvatarSession>;
  stopAvatarSession(): void;
  setTalking(isTalking: boolean): void;
  getSession(): AvatarSession;
  subscribe(listener: (session: AvatarSession) => void): () => void;
}

class ModularAvatarService implements AvatarService {
  private session: AvatarSession = { id: 'fallback-avatar', provider: 'browser', isTalking: false, status: 'idle' };
  private listeners = new Set<(session: AvatarSession) => void>();

  private publish(): void {
    this.listeners.forEach((listener) => listener(this.session));
  }

  async initializeAvatarSession(provider: AvatarProvider = 'browser'): Promise<AvatarSession> {
    // The browser provider deliberately has no network dependency: the UI renders an animated canvas fallback.
    this.session = { id: `avatar-${Date.now()}`, provider, isTalking: false, status: 'ready' };
    this.publish();
    return this.session;
  }

  async streamAvatarVideo(): Promise<AvatarSession> {
    this.session = { ...this.session, status: 'streaming' };
    this.publish();
    return this.session;
  }

  stopAvatarSession(): void {
    this.session = { ...this.session, isTalking: false, status: 'stopped' };
    this.publish();
  }

  setTalking(isTalking: boolean): void {
    this.session = { ...this.session, isTalking };
    this.publish();
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
