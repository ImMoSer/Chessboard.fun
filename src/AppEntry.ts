// src/AppEntry.ts
import { init, propsModule, eventListenersModule, styleModule, classModule, attributesModule } from 'snabbdom';
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
import './features/tacktics/tacktics.css'; // <<< ДОБАВЛЕНО

// Import core services
import { ChessboardService } from './core/chessboard.service';
import { StockfishService as GameplayStockfishService } from './core/stockfish.service';
import { InfiniteAnalysisStockfishService } from './core/infiniteAnalysisStockfish.service';
import { WebhookService } from './core/webhook.service';
import { initI18nService } from './core/i18n.service';
import { PgnService } from './core/pgn.service';
import { gameplayService } from './core/gameplay.service';
import logger from './utils/logger';

// Import main application controller and view
import { AppController } from './AppController';
import { renderAppUI } from './appView';

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
const gameplayStockfishService = new GameplayStockfishService();
const infiniteAnalysisStockfishService = new InfiniteAnalysisStockfishService();
const webhookServiceInstance = WebhookService;
const pgnServiceInstance = PgnService;

let oldVNode: VNode | Element = document.getElementById('app')!;
if (!oldVNode) {
  const errorMsg = "[AppEntry] Root element #app not found in index.html. Application cannot start.";
  logger.error(errorMsg);
  const body = document.body;
  if (body) {
      const errorDiv = document.createElement('div');
      errorDiv.textContent = errorMsg;
      errorDiv.style.color = 'red';
      errorDiv.style.padding = '20px';
      errorDiv.style.fontSize = '18px';
      body.prepend(errorDiv);
  }
  throw new Error(errorMsg);
}

let appController: AppController;
let isRedrawScheduled = false;
let animationFrameId: number | null = null;

function requestGlobalRedraw() {
  if (isRedrawScheduled) {
    logger.debug("[AppEntry requestGlobalRedraw] Skipped as a redraw is already scheduled.");
    return;
  }

  if (!appController) {
    logger.warn("[AppEntry requestGlobalRedraw] Skipped as appController is not yet initialized.");
    return;
  }

  isRedrawScheduled = true;
  logger.debug("[AppEntry requestGlobalRedraw] Scheduling redraw via requestAnimationFrame.");

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }

  animationFrameId = requestAnimationFrame(() => {
    try {
      const newVNode = renderAppUI(appController);
      oldVNode = patch(oldVNode, newVNode);
      logger.debug("[AppEntry requestGlobalRedraw] Main application view re-rendered and patch completed (via rAF).");
    } catch (error) {
      logger.error("[AppEntry requestGlobalRedraw] Error during patch (via rAF):", error);
    } finally {
      isRedrawScheduled = false;
      animationFrameId = null;
    }
  });
}

async function initializeApplication() {
  try {
    await initI18nService(); 
    logger.info('[AppEntry] i18n service initialized.');

    appController = new AppController(
      {
        chessboardService,
        gameplayStockfishService,
        infiniteAnalysisStockfishService,
        webhookService: webhookServiceInstance,
        gameplayService: gameplayService, 
        logger,
      },
      requestGlobalRedraw,
      pgnServiceInstance
    );

    await appController.initializeApp();
    logger.info('[AppEntry] AppController initialization sequence complete.');

  } catch (error) {
    logger.error('[AppEntry] Critical error during application initialization:', error);
    if (oldVNode instanceof Element) {
        const errorVNode = {
            sel: 'div',
            data: { style: { color: 'red', padding: '20px', fontSize: '18px', textAlign: 'center' } },
            children: [
                { sel: 'h1', data: {}, text: 'Application Initialization Failed' },
                { sel: 'p', data: {}, text: 'A critical error occurred. Please try refreshing the page or contact support.' },
                { sel: 'pre', data: { style: { whiteSpace: 'pre-wrap', fontSize: '12px' } }, text: (error as Error).message }
            ]
        };
        patch(oldVNode, errorVNode as VNode);
    }
  }
}

initializeApplication();

window.addEventListener('beforeunload', () => {
    logger.info('[AppEntry] beforeunload event triggered. Terminating services.');
    gameplayStockfishService.terminate();
    infiniteAnalysisStockfishService.terminate();
});

window.addEventListener('resize', () => {
    if (appController) {
        appController.handleResize();
    }
});

logger.info('[AppEntry] Initial setup complete. Asynchronous initialization started.');
