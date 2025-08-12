// src/features/about/aboutController.ts
import logger from '../../utils/logger';
import type { VNode } from 'snabbdom';
import { renderAboutPage } from './aboutView';
import type { AppController } from '../../AppController';

/**
 * Controller for the "About" page.
 * This is a simple controller as the page is mostly static.
 */
export class AboutController {
  private appController: AppController;

  constructor(appController: AppController) {
    this.appController = appController;
    logger.info('[AboutController] Initialized.');
  }

  public renderPage(): VNode {
    return renderAboutPage(this.appController);
  }

  /**
   * Cleans up resources when the controller is no longer needed.
   */
  public destroy(): void {
    logger.info('[AboutController] Destroyed.');
  }
}
