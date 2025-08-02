// src/features/welcome/welcomeController.ts
import { AuthService } from '../../core/auth.service';
import logger from '../../utils/logger';

export interface WelcomeControllerState {
  isAuthProcessing: boolean;
  authError: string | null;
}

export class WelcomeController {
  public state: WelcomeControllerState;
  public authService: typeof AuthService; // <<< ИЗМЕНЕНО
  private unsubscribeFromAuthChanges: (() => void) | null = null;
  private requestGlobalRedraw: () => void;

  constructor(authService: typeof AuthService, requestGlobalRedraw: () => void) {
    this.authService = authService;
    this.requestGlobalRedraw = requestGlobalRedraw;

    const currentAuthState = this.authService.getState();
    this.state = {
      isAuthProcessing: currentAuthState.isProcessing,
      authError: currentAuthState.error,
    };

    this.unsubscribeFromAuthChanges = this.authService.subscribe(() => this.onAuthStateChanged());
    logger.info('[WelcomeController] Initialized');
  }

  private onAuthStateChanged(): void {
    const currentAuthState = this.authService.getState();
    let needsRedraw = false;

    if (this.state.isAuthProcessing !== currentAuthState.isProcessing) {
      this.state.isAuthProcessing = currentAuthState.isProcessing;
      needsRedraw = true;
    }
    if (this.state.authError !== currentAuthState.error) {
      this.state.authError = currentAuthState.error;
      needsRedraw = true;
    }

    if (needsRedraw) {
      logger.debug('[WelcomeController] Auth state changed, requesting redraw.', this.state);
      this.requestGlobalRedraw();
    }
  }

  public async handleLogin(): Promise<void> {
    if (this.state.isAuthProcessing) {
      logger.warn('[WelcomeController] Login attempt while already processing.');
      return;
    }
    logger.info('[WelcomeController] Login button clicked, initiating Lichess login.');
    await this.authService.login();
  }

  public updateLocalizedTexts(): void {}

  public destroy(): void {
    if (this.unsubscribeFromAuthChanges) {
      this.unsubscribeFromAuthChanges();
      this.unsubscribeFromAuthChanges = null;
    }
    logger.info('[WelcomeController] Destroyed, unsubscribed from auth changes.');
  }
}
