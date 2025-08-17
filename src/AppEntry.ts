// src/AppEntry.ts
import { init, propsModule, eventListenersModule, styleModule, classModule, attributesModule, h } from 'snabbdom';
import type { VNode } from 'snabbdom';

// Import base and main application styles
import './assets/base.css';
import './assets/main.css';

// Import styles for features
import './shared/components/controlPanel.css';
import './features/common/promotion/promotion.css';
import './features/analysis/analysisPanel.css';
import './features/finishHim/finishHim.css';
import './features/tower/tower.css';
import './features/welcome/welcome.css';
import './features/clubPage/clubPage.css';
import './features/recordsPage/recordsPage.css';
import './features/userCabinet/userCabinet.css';
import './features/lichessClubs/lichessClubs.css';
import './features/about/about.css';
import './features/attack/attack.css';
import './features/tacktics/tacktics.css';

// Import core services
import { ChessboardService } from './core/chessboard.service';
import { WebhookService } from './core/webhook.service';
import { initI18nService } from './core/i18n.service';
import { PgnService } from './core/pgn.service';
import { gameplayService } from './core/gameplay.service';
import logger from './utils/logger';
import { StockfishManager } from './core/stockfish-manager.service';

// Import main application controller and view
import { AppController } from './AppController';
import { renderAppShell } from './appView';

// Chessground styles
import './vendor/chessground/chessground.base.css';
import './vendor/chessground/chessground.brown.css';


logger.info('[AppEntry] Application starting...');

const patch = init([
  attributesModule,
  propsModule,
  eventListenersModule,
  styleModule,
  classModule,
]);

const chessboardService = new ChessboardService();
const webhookServiceInstance = WebhookService;
const pgnServiceInstance = PgnService;

let appRootElement: HTMLElement = document.getElementById('app')!;
if (!appRootElement) {
  const errorMsg = "[AppEntry] Root element #app not found in index.html. Application cannot start.";
  logger.error(errorMsg);
  document.body.innerHTML = `<div style="color: red; padding: 20px; font-size: 18px;">${errorMsg}</div>`;
  throw new Error(errorMsg);
}

let appController: AppController;
let appShellVNode: VNode | Element;
let isShellRedrawScheduled = false;

function requestShellRedraw() {
    if (isShellRedrawScheduled) return;
    isShellRedrawScheduled = true;
    requestAnimationFrame(() => {
        if (appController) {
            const newShellVNode = renderAppShell(appController);
            appShellVNode = patch(appShellVNode, newShellVNode);
        }
        isShellRedrawScheduled = false;
    });
}

async function initializeApplication() {
  try {
    await initI18nService();
    logger.info('[AppEntry] i18n service initialized.');

    appController = new AppController(
      {
        chessboardService,
        webhookService: webhookServiceInstance,
        gameplayService: gameplayService,
        logger,
      },
      patch,
      requestShellRedraw,
      pgnServiceInstance
    );

    // 1. First, render the basic application shell.
    // This ensures the #page-content-wrapper exists before any page controller tries to use it.
    appShellVNode = patch(appRootElement, renderAppShell(appController));
    logger.info('[AppEntry] Initial application shell rendered.');

    // 2. Now, initialize the AppController. This will trigger routing and load the first page.
    await appController.initializeApp();
    logger.info('[AppEntry] AppController initialization sequence complete.');
    
  } catch (error) {
    logger.error('[AppEntry] Critical error during application initialization:', error);
    const errorVNode = h('div', { style: { color: 'red', padding: '20px' } }, [
      h('h1', 'Application Initialization Failed'),
      h('p', 'A critical error occurred. Please try refreshing the page.'),
      h('pre', (error as Error).message)
    ]);
    patch(appRootElement, errorVNode);
  }
}

initializeApplication();

window.addEventListener('beforeunload', () => {
    logger.info('[AppEntry] beforeunload event triggered. Terminating services.');
    StockfishManager.terminate();
});

window.addEventListener('resize', () => {
    if (appController) {
        appController.handleResize();
    }
});

logger.info('[AppEntry] Initial setup complete. Asynchronous initialization started.');
