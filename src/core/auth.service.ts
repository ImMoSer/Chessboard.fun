// src/core/auth.service.ts
import logger from '../utils/logger';
import { t } from '../core/i18n.service';

export type SubscriptionTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'administrator';

export interface ClubIdNamePair {
  club_id: string;
  club_name: string;
}

export interface LichessUserProfile {
  id: string;
  username: string;
  email?: string;
  perfs?: Record<string, { rating: number; prog: number; games: number }>;
  createdAt?: number;
  profile?: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    country?: string;
    location?: string;
  };
}

export interface FinishHimStats {
  gamesPlayed: number;
  tacticalRating: number;
  tacticalWins: number;
  tacticalLosses: number;
  finishHimRating: number;
  playoutWins: number;
  playoutDraws: number;
  playoutLosses: number;
}

export interface TowerAttempt {
  versuch: number;
  tower_id: string;
  best_time: number;
}
export type TowerStats = { [key: string]: TowerAttempt[] };
export interface AttackStat {
  PuzzleId: string;
  best_time: number;
}

export interface TelegramData {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  language_code: string;
}

export interface UserSessionProfile extends LichessUserProfile {
  FunCoins: number;
  subscriptionTier: SubscriptionTier;
  finishHimStats: FinishHimStats;
  tower_stats?: TowerStats;
  attack_stats?: AttackStat[];
  follow_clubs?: ClubIdNamePair[];
  club_founder?: ClubIdNamePair[];
  validatedAt?: number;
  telegram_jsonb?: TelegramData | null;
  TierExpire?: string | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  userProfile: UserSessionProfile | null;
  isProcessing: boolean;
  error: string | null;
}

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

  private subscribers = new Set<() => void>();

  constructor() {
    logger.info(`[AuthService] Initializing with Backend API URL: ${BACKEND_API_URL}`);
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

  public async logout(): Promise<void> {
    logger.info('[AuthService] Redirecting to backend for logout...');
    this._setState({ isProcessing: true });
    window.location.href = `${BACKEND_API_URL}/auth/lichess/logout`;
  }

  public async handleAuthentication(): Promise<boolean> {
    logger.info('[AuthService] Checking for existing session with backend...');
    await this.checkSession();
    return false;
  }

  public async checkSession(): Promise<void> {
    this._setState({ isProcessing: true, error: null });
    try {
      const response = await fetch(`${BACKEND_API_URL}/auth/lichess/profile`, {
        credentials: 'include',
      });

      if (response.ok) {
        const userProfile: UserSessionProfile = await response.json();
        logger.info(`[AuthService] Session valid. User "${userProfile.username}" authenticated.`);
        this._setState({
          isAuthenticated: true,
          userProfile: userProfile,
          isProcessing: false,
        });
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
      } else {
        logger.info('[AuthService] No active session found or session expired.');
        this.clearAuthDataLocal();
      }
    } catch (error) {
      logger.error('[AuthService] Error checking session:', error);
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
    localStorage.removeItem('lichess_token');
    localStorage.removeItem('app_session_token');
    localStorage.removeItem('lichess_user_profile');

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
  
  // <<< НАЧАЛО ИЗМЕНЕНИЙ
  /**
   * Updates the local user profile state and saves it to localStorage.
   * This allows for "optimistic updates" of data like FunCoins.
   * @param updatedData - An object with properties of UserSessionProfile to update.
   */
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
  // <<< КОНЕЦ ИЗМЕНЕНИЙ
}

export const AuthService = new AuthServiceController();
