// src/services/AuthService.ts
import logger from '../utils/logger'
import i18n from './i18n'
import type { UserSessionProfile, AuthState, UserStatsUpdate } from '../types/api.types'

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL as string

if (!BACKEND_API_URL) {
  logger.error(
    '[AuthService] Critical Configuration Error: VITE_BACKEND_API_URL is not defined in your .env file.',
  )
}

const t = i18n.global.t

class AuthServiceController {
  private state: AuthState = {
    isAuthenticated: false,
    userProfile: null,
    isProcessing: true,
    error: null,
  }

  private subscribers = new Set<() => void>()

  constructor() {
    logger.info(`[AuthService] Initializing with Backend API URL: ${BACKEND_API_URL}`)
  }

  public getState(): Readonly<AuthState> {
    return this.state
  }

  private _setState(newState: Partial<AuthState>, notify: boolean = true) {
    this.state = { ...this.state, ...newState }
    if (notify) {
      this.notifySubscribers()
    }
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  private notifySubscribers(): void {
    logger.debug('[AuthService] Notifying subscribers of state change.')
    this.subscribers.forEach((callback) => {
      try {
        callback()
      } catch (e) {
        logger.error('[AuthService] Error in subscriber callback:', e)
      }
    })
  }

  public async login(): Promise<void> {
    logger.info('[AuthService] Redirecting to backend for Lichess login...')
    this._setState({ isProcessing: true })
    window.location.href = `${BACKEND_API_URL}/auth/lichess/login`
  }

  public async logout(): Promise<void> {
    logger.info('[AuthService] Redirecting to backend for logout...')
    this._setState({ isProcessing: true })
    window.location.href = `${BACKEND_API_URL}/auth/lichess/logout`
  }

  public async handleAuthentication(): Promise<boolean> {
    logger.info('[AuthService] Handling authentication...')
    await this.checkSession()
    return this.state.isAuthenticated
  }

  public async checkSession(): Promise<void> {
    this._setState({ isProcessing: true, error: null })
    try {
      const response = await fetch(`${BACKEND_API_URL}/auth/lichess/profile`, {
        credentials: 'include',
      })

      if (response.ok) {
        const userProfile: UserSessionProfile = await response.json()
        logger.info(
          `[AuthService] Web session valid. User "${userProfile.username}" authenticated.`,
        )
        this._setState({
          isAuthenticated: true,
          userProfile: userProfile,
          isProcessing: false,
        })
        localStorage.setItem('user_profile', JSON.stringify(userProfile))
      } else {
        logger.info('[AuthService] No active web session found.')
        this.clearAuthDataLocal()
      }
    } catch (error) {
      logger.error('[AuthService] Error checking web session:', error)
      this._setState({
        error: t('errors.backendConnectionFailed'),
        isProcessing: false,
        isAuthenticated: false,
        userProfile: null,
      })
      localStorage.removeItem('user_profile')
    }
  }

  public clearAuthDataLocal(): void {
    localStorage.removeItem('user_profile')
    this._setState({
      userProfile: null,
      isAuthenticated: false,
      isProcessing: false,
      error: null,
    })
    logger.info('[AuthService] Local authentication data cleared.')
  }

  public getIsAuthenticated(): boolean {
    return this.state.isAuthenticated
  }
  public getUserProfile(): UserSessionProfile | null {
    return this.state.userProfile
  }
  public getIsProcessing(): boolean {
    return this.state.isProcessing
  }
  public getError(): string | null {
    return this.state.error
  }

  public getFunCoins(): number | null {
    return this.state.userProfile?.FunCoins ?? null
  }

  public updateUserProfile(updatedData: Partial<UserSessionProfile>) {
    if (this.state.userProfile) {
      const newProfile = { ...this.state.userProfile, ...updatedData }
      this._setState({ userProfile: newProfile })
      localStorage.setItem('user_profile', JSON.stringify(newProfile))
      logger.info('[AuthService] User profile updated locally.', updatedData)
    } else {
      logger.warn('[AuthService] updateUserProfile called but no user is logged in.')
    }
  }

  public updateUserStatsFromResponse(statsUpdate: UserStatsUpdate) {
    if (this.state.userProfile && this.state.userProfile.id === statsUpdate.id) {
      const newProfile = {
        ...this.state.userProfile,
        ...statsUpdate,
      }
      this._setState({ userProfile: newProfile })
      localStorage.setItem('user_profile', JSON.stringify(newProfile))
      logger.info('[AuthService] User stats updated from game result.', statsUpdate)
    } else {
      logger.warn(
        '[AuthService] updateUserStatsFromResponse called but no user is logged in or ID mismatch.',
      )
    }
  }
}

export const authService = new AuthServiceController()
