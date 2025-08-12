// src/features/welcome/welcomeController.ts
import { AuthService } from '../../core/auth.service';
import logger from '../../utils/logger';
import { renderWelcomePage } from './welcomeView';
import type { VNode } from 'snabbdom';
import type { AppController } from '../../AppController';

export interface WelcomeControllerState {
  isAuthProcessing: boolean;
  authError: string | null;
}

export class WelcomeController {
  public state: WelcomeControllerState;
  public authService: typeof AuthService;
  private appController: AppController;
  private unsubscribeFromAuthChanges: (() => void) | null = null;
  private requestPageRedraw: () => void;

  constructor(
    authService: typeof AuthService,
    appController: AppController,
    requestPageRedraw: () => void
    ) {
    this.authService = authService;
    this.appController = appController;
    this.requestPageRedraw = requestPageRedraw;

    const currentAuthState = this.authService.getState();
    this.state = {
      isAuthProcessing: currentAuthState.isProcessing,
      authError: currentAuthState.error,
    };

    this.unsubscribeFromAuthChanges = this.authService.subscribe(() => this.onAuthStateChanged());
    logger.info('[WelcomeController] Initialized');
  }

  public renderPage(): VNode {
    return renderWelcomePage(this, this.appController);
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
      this.requestPageRedraw();
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
