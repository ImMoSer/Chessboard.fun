// src/features/about/aboutController.ts
import logger from '../../utils/logger';

/**
 * Controller for the "About" page.
 * This is a simple controller as the page is mostly static.
 */
export class AboutController {
  constructor() {
    logger.info('[AboutController] Initialized.');
  }

  /**
   * Cleans up resources when the controller is no longer needed.
   */
  public destroy(): void {
    logger.info('[AboutController] Destroyed.');
  }
}