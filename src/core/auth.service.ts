// src/core/auth.service.ts
import logger from '../utils/logger';
import { t } from '../core/i18n.service';
import type { 
    UserSessionProfile, 
    AuthState, 
    FinishHimStats, 
    ClubIdNamePair 
} from './api.types';

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL as string;

if (!BACKEND_API_URL) {
    logger.error('[AuthService] Critical Configuration Error: VITE_BACKEND_API_URL is not defined in your .env file.');
}

class AuthServiceController {
  private state: AuthState = {
    isAuthenticated: false,
    userProfile: null,
    isProcessing: true,
    error: null,
  };

  // ИЗМЕНЕНО: Добавляем приватное поле для хранения initData
  private telegramInitData: string | null = null;

  private subscribers = new Set<() => void>();

  constructor() {
    logger.info(`[AuthService] Initializing with Backend API URL: ${BACKEND_API_URL}`);
    // ИЗМЕНЕНО: При инициализации сразу пытаемся получить initData
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initData) {
        this.telegramInitData = tg.initData;
        logger.info('[AuthService] Telegram initData captured on startup.');
    }
  }

  // ИЗМЕНЕНО: Геттер для получения initData другими сервисами (например, WebhookService)
  public getTelegramInitData(): string | null {
    return this.telegramInitData;
  }

  public getState(): Readonly<AuthState> {
    return this.state;
  }

  private _setState(newState: Partial<AuthState>, notify: boolean = true) {
    this.state = { ...this.state, ...newState };
    if (notify) {
      this.notifySubscribers();
    }
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    logger.debug('[AuthService] Notifying subscribers of state change.');
    this.subscribers.forEach(callback => {
      try { callback(); } catch (e) { logger.error('[AuthService] Error in subscriber callback:', e); }
    });
  }

  public async login(): Promise<void> {
    logger.info('[AuthService] Redirecting to backend for Lichess login...');
    this._setState({ isProcessing: true });
    window.location.href = `${BACKEND_API_URL}/auth/lichess/login`;
  }

  // ИЗМЕНЕНО: Логика полностью переписана под stateless подход
  public async loginViaTelegram(): Promise<void> {
    logger.info('[AuthService] Attempting stateless login via Telegram...');
    this._setState({ isProcessing: true, error: null });

    if (!this.telegramInitData) {
      logger.error('[AuthService] Telegram initData is not available for login.');
      this._setState({ isProcessing: false, error: 'Telegram data not available.' });
      return;
    }

    try {
      const response = await fetch(`${BACKEND_API_URL}/auth/telegram/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: this.telegramInitData }),
      });

      if (!response.ok) {
        throw new Error(`Backend validation failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'linking_required') {
        logger.info('[AuthService] Telegram user not linked. Redirecting to Lichess.');
        const encodedInitData = encodeURIComponent(this.telegramInitData);
        window.location.href = `${BACKEND_API_URL}/auth/lichess/login?state=${encodedInitData}`;
      } else if (result.status === 'ok' && result.profile) {
        const userProfile: UserSessionProfile = result.profile;
        logger.info(`[AuthService] Stateless auth successful. User "${userProfile.username}" authenticated.`);
        this._setState({
          isAuthenticated: true,
          userProfile: userProfile,
          isProcessing: false,
        });
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
      } else {
        throw new Error('Invalid response from backend during Telegram validation.');
      }
    } catch (error) {
      logger.error('[AuthService] Error during Telegram login process:', error);
      this._setState({
        error: t('errors.telegramAuthFailed', { defaultValue: 'Telegram authentication failed.' }),
        isProcessing: false,
      });
    }
  }

  public async logout(): Promise<void> {
    logger.info('[AuthService] Redirecting to backend for logout...');
    this._setState({ isProcessing: true });
    window.location.href = `${BACKEND_API_URL}/auth/lichess/logout`;
  }

  // ИЗМЕНЕНО: Упрощенная логика для handleAuthentication
  public async handleAuthentication(): Promise<boolean> {
    logger.info('[AuthService] Handling authentication...');
    
    if (this.telegramInitData) {
        // Если мы в Telegram, используем stateless логин
        await this.loginViaTelegram();
    } else {
        // Если мы в обычном браузере, используем stateful логин с cookie
        await this.checkSession();
    }
    
    return this.state.isAuthenticated;
  }

  public async checkSession(): Promise<void> {
    this._setState({ isProcessing: true, error: null });
    try {
      const response = await fetch(`${BACKEND_API_URL}/auth/lichess/profile`, {
        credentials: 'include',
      });

      if (response.ok) {
        const userProfile: UserSessionProfile = await response.json();
        logger.info(`[AuthService] Web session valid. User "${userProfile.username}" authenticated.`);
        this._setState({
          isAuthenticated: true,
          userProfile: userProfile,
          isProcessing: false,
        });
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
      } else {
        logger.info('[AuthService] No active web session found.');
        this.clearAuthDataLocal();
      }
    } catch (error) {
      logger.error('[AuthService] Error checking web session:', error);
      this._setState({
        error: t('errors.backendConnectionFailed', { defaultValue: 'Could not connect to the server.' }),
        isProcessing: false,
        isAuthenticated: false,
        userProfile: null,
      });
      localStorage.removeItem('user_profile');
    }
  }

  public clearAuthDataLocal(): void {
    localStorage.removeItem('user_profile');
    this._setState({
        userProfile: null,
        isAuthenticated: false,
        isProcessing: false,
        error: null,
    });
    logger.info('[AuthService] Local authentication data cleared.');
  }

  public getIsAuthenticated(): boolean { return this.state.isAuthenticated; }
  public getUserProfile(): UserSessionProfile | null { return this.state.userProfile; }
  public getIsProcessing(): boolean { return this.state.isProcessing; }
  public getError(): string | null { return this.state.error; }

  public getFinishHimStats(): FinishHimStats | null {
    return this.state.userProfile?.finishHimStats || null;
  }
  public getFunCoins(): number | null {
      return this.state.userProfile?.FunCoins ?? null;
  }
  public getFollowClubs(): ClubIdNamePair[] | undefined {
    return this.state.userProfile?.follow_clubs;
  }
  
  public getFounderClubs(): ClubIdNamePair[] | undefined {
    return this.state.userProfile?.club_founder;
  }
  
  public updateUserProfile(updatedData: Partial<UserSessionProfile>) {
      if (this.state.userProfile) {
          const newProfile = { ...this.state.userProfile, ...updatedData };
          this._setState({ userProfile: newProfile });
          localStorage.setItem('user_profile', JSON.stringify(newProfile));
          logger.info('[AuthService] User profile updated locally.', updatedData);
      } else {
          logger.warn('[AuthService] updateUserProfile called but no user is logged in.');
      }
  }
}

export const AuthService = new AuthServiceController();
