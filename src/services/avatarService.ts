export type AvatarProvider = 'browser' | 'heygen' | 'did';

export interface AvatarSession {
  provider: AvatarProvider;
  isTalking: boolean;
  streamUrl?: string;
}

export interface AvatarService {
  createSession(provider?: AvatarProvider): Promise<AvatarSession>;
  setTalking(isTalking: boolean): void;
  getSession(): AvatarSession;
}

class ModularAvatarService implements AvatarService {
  private session: AvatarSession = { provider: 'browser', isTalking: false };

  async createSession(provider: AvatarProvider = 'browser'): Promise<AvatarSession> {
    this.session = { provider, isTalking: false };
    return this.session;
  }

  setTalking(isTalking: boolean): void {
    this.session = { ...this.session, isTalking };
  }

  getSession(): AvatarSession {
    return this.session;
  }
}

export const avatarService: AvatarService = new ModularAvatarService();
export const createAvatarSession = (provider?: AvatarProvider) => avatarService.createSession(provider);
export const setAvatarTalking = (isTalking: boolean) => avatarService.setTalking(isTalking);
