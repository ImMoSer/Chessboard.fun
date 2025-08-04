// src/AppController.ts
import logger from './utils/logger';
import type { ChessboardService } from './core/chessboard.service';
import type { StockfishService as GameplayStockfishService } from './core/stockfish.service';
import { InfiniteAnalysisStockfishService } from './core/infiniteAnalysisStockfish.service';
import { type WebhookServiceController, RateLimitError } from './core/webhook.service';
import type { GameplayServiceController, EngineId } from './core/gameplay.service';
import { BoardHandler } from './core/boardHandler';
import { PgnService } from './core/pgn.service';
import { AnalysisService } from './core/analysis.service';
import { AnalysisController } from './features/analysis/analysisController';
import { subscribeToLangChange, getCurrentLang, t, changeLang } from './core/i18n.service';
import { FinishHimController } from './features/finishHim/finishHimController';
import { WelcomeController } from './features/welcome/welcomeController';
import { AuthService, type UserSessionProfile } from './core/auth.service';
import { ClubPageController } from './features/clubPage/ClubPageController';
import { RecordsPageController } from './features/recordsPage/RecordsPageController';
import { UserCabinetController } from './features/userCabinet/UserCabinetController';
import { TowerController } from './features/tower/TowerController';
import { LichessClubsController } from './features/lichessClubs/LichessClubsController';
import { AboutController } from './features/about/aboutController';
import { AttackController } from './features/attack/attackController';
import { TackticsController } from './features/tacktics/tackticsController';
import { RoutingService, type Route } from './core/routing.service';
import { ThemeService, type AppTheme } from './core/theme.service';
import { SoundService } from './core/sound.service'; // <<< ДОБАВЛЕНО

export type AppPage = 'welcome' | 'finishHim' | 'clubPage' | 'recordsPage' | 'userCabinet' | 'tower' | 'lichessClubs' | 'about' | 'attack' | 'tacktics';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export interface ShareData {
    url: string;
    text: string;
    title: string;
}

export interface GameControlsState {
  canRequestNew: boolean;
  onRequestNew: () => void;
  canRestart: boolean;
  onRestart: () => void;
  canResign: boolean;
  onResign: () => void;
  onShare: () => void;
  onExit: () => void;
}

export interface AppServices {
  authService: typeof AuthService;
  chessboardService: ChessboardService;
  gameplayStockfishService: GameplayStockfishService;
  infiniteAnalysisStockfishService: InfiniteAnalysisStockfishService;
  gameplayService: GameplayServiceController;
  webhookService: WebhookServiceController;
  analysisService: AnalysisService;
  logger: typeof logger;
  appController: AppController;
  pgnServiceInstance: typeof PgnService;
  themeService: typeof ThemeService;
  soundService: typeof SoundService; // <<< ДОБАВЛЕНО
}

interface AppControllerState {
  currentPage: AppPage;
  currentClubId: string | null;
  currentPuzzleId: string | null;
  currentTowerId: string | null;
  isNavExpanded: boolean;
  isPortraitMode: boolean;
  currentUser: UserSessionProfile | null;
  isLoadingAuth: boolean;
  isModalVisible: boolean;
  modalMessage: string | null;
  isRateLimited: boolean; 
  rateLimitCooldownSeconds: number;
  isConfirmationModalVisible: boolean;
  confirmationModalMessage: string | null;
  onConfirmAction: (() => void) | null;
  onCancelAction: (() => void) | null;
  confirmButtonText: string | null;
  cancelButtonText: string | null;
  selectedEngine: EngineId;
  currentTheme: AppTheme;
  activeDropdown: string | null;
  currentGameControls: GameControlsState | null;
  engineSelectorOpen: boolean;
  toasts: Toast[];
  voiceVolume: number; // <<< ДОБАВЛЕНО
}

type ActivePageController = WelcomeController | FinishHimController | ClubPageController | RecordsPageController | UserCabinetController | TowerController | LichessClubsController | AboutController | AttackController | TackticsController | null;

const BOARD_MAX_VH = 94;
const BOARD_MIN_VH = 10;
const DEFAULT_BOARD_VH = 70;
const DEFAULT_ENGINE_ID: EngineId = 'SF_1900';
const ENGINE_STORAGE_KEY = 'user_preferred_engine';
const APP_VERSION_STORAGE_KEY = 'app_version';

// <<< ИСПРАВЛЕНО: Эти константы теперь объявлены в глобальной области видимости файла
const PRIVATE_PAGES: AppPage[] = ['finishHim', 'tower', 'userCabinet', 'attack', 'clubPage', 'recordsPage', 'lichessClubs', 'tacktics'];
const PRE_AUTH_REDIRECT_URL_KEY = 'preAuthRedirectUrl';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'v-dev';

export class AppController {
  public state: AppControllerState;
  public activePageController: ActivePageController | null = null;
  public services: AppServices;
  private routingService: RoutingService;
  private requestGlobalRedraw: () => void;
  private userPreferredBoardSizeVh: number;
  private rateLimitTimerId: number | null = null;
  private toastIdCounter = 0;

  public analysisControllerInstance: AnalysisController | null = null;
  private authServiceInstance: typeof AuthService;
  private webhookServiceInstance: WebhookServiceController;
  public pgnServiceInstance: typeof PgnService;
  private themeServiceInstance: typeof ThemeService;
  private soundServiceInstance: typeof SoundService;

  private unsubscribeFromLangChange: (() => void) | null = null;
  private unsubscribeFromAuthChange: (() => void) | null = null;
  private unsubscribeFromRouteChange: (() => void) | null = null;
  
  private isRedrawQueued: boolean = false;

  constructor(
    globalServices: {
      chessboardService: ChessboardService;
      gameplayStockfishService: GameplayStockfishService;
      infiniteAnalysisStockfishService: InfiniteAnalysisStockfishService;
      webhookService: WebhookServiceController;
      gameplayService: GameplayServiceController;
      logger: typeof logger;
    },
    requestGlobalRedraw: () => void,
    pgnServiceInstance: typeof PgnService
  ) {
    this.authServiceInstance = AuthService;
    this.webhookServiceInstance = globalServices.webhookService;
    const analysisServiceInstance = new AnalysisService(
        globalServices.gameplayStockfishService,
        globalServices.infiniteAnalysisStockfishService
    );
    this.pgnServiceInstance = pgnServiceInstance;
    this.routingService = new RoutingService();
    this.themeServiceInstance = ThemeService;
    this.soundServiceInstance = SoundService;

    this.services = {
      chessboardService: globalServices.chessboardService,
      gameplayStockfishService: globalServices.gameplayStockfishService,
      infiniteAnalysisStockfishService: globalServices.infiniteAnalysisStockfishService,
      webhookService: this.webhookServiceInstance,
      gameplayService: globalServices.gameplayService,
      logger: globalServices.logger,
      authService: this.authServiceInstance,
      analysisService: analysisServiceInstance,
      appController: this,
      pgnServiceInstance: this.pgnServiceInstance,
      themeService: this.themeServiceInstance,
      soundService: this.soundServiceInstance,
    };
    this.requestGlobalRedraw = requestGlobalRedraw;

    const savedVhPreference = localStorage.getItem('userPreferredBoardSizeVh');
    this.userPreferredBoardSizeVh = savedVhPreference ? parseFloat(savedVhPreference) : DEFAULT_BOARD_VH;
    this.userPreferredBoardSizeVh = Math.max(BOARD_MIN_VH, Math.min(BOARD_MAX_VH, this.userPreferredBoardSizeVh));

    const savedEngine = localStorage.getItem(ENGINE_STORAGE_KEY) as EngineId | null;

    this.state = {
      currentPage: 'welcome',
      currentClubId: null,
      currentPuzzleId: null,
      currentTowerId: null,
      isNavExpanded: false,
      isPortraitMode: window.matchMedia('(orientation: portrait)').matches,
      currentUser: null,
      isLoadingAuth: true,
      isModalVisible: false,
      modalMessage: null,
      isRateLimited: false,
      rateLimitCooldownSeconds: 0,
      isConfirmationModalVisible: false,
      confirmationModalMessage: null,
      onConfirmAction: null,
      onCancelAction: null,
      confirmButtonText: null,
      cancelButtonText: null,
      selectedEngine: savedEngine || DEFAULT_ENGINE_ID,
      currentTheme: this.themeServiceInstance.getCurrentTheme(),
      activeDropdown: null,
      currentGameControls: null,
      engineSelectorOpen: false,
      toasts: [],
      voiceVolume: this.soundServiceInstance.getVoiceVolume(),
    };

    this.unsubscribeFromLangChange = subscribeToLangChange(() => {
      logger.info('[AppController] Language changed, requesting global redraw.');
      this.requestGlobalRedraw();
    });

    this.unsubscribeFromAuthChange = this.authServiceInstance.subscribe(() => this._onAuthStateChanged());

    logger.info(`[AppController] Initialized. Current lang: ${getCurrentLang()}, Selected Engine: ${this.state.selectedEngine}`);
  }

  private _checkForAppUpdate(): void {
    const storedVersion = localStorage.getItem(APP_VERSION_STORAGE_KEY);
    if (storedVersion && storedVersion !== APP_VERSION) {
      logger.info(`[AppController] New version detected. Current: ${storedVersion}, New: ${APP_VERSION}. Reloading app...`);
      localStorage.setItem(APP_VERSION_STORAGE_KEY, APP_VERSION);
      window.location.reload();
    } else if (!storedVersion) {
      localStorage.setItem(APP_VERSION_STORAGE_KEY, APP_VERSION);
      logger.info(`[AppController] First run, storing app version: ${APP_VERSION}.`);
    } else {
      logger.info(`[AppController] App version is up to date: ${APP_VERSION}.`);
    }
  }

  public getAppVersion(): string {
    return APP_VERSION;
  }
  
  public handleVolumeChange(volume: number): void {
    this.soundServiceInstance.setVoiceVolume(volume);
    this.setState({ voiceVolume: volume });
  }

  public showToast(message: string, type: 'success' | 'error' = 'success', duration: number = 3000): void {
    const id = this.toastIdCounter++;
    const newToast: Toast = { id, message, type };
    
    this.setState({ toasts: [...this.state.toasts, newToast] });

    setTimeout(() => {
      this.setState({ toasts: this.state.toasts.filter(t => t.id !== id) });
    }, duration);
  }

  public async handleShare(shareData: ShareData): Promise<void> {
    if (navigator.share) {
        try {
            await navigator.share({
                title: shareData.title,
                text: shareData.text,
                url: shareData.url,
            });
            this.showToast(t('common.shareSuccess', { defaultValue: 'Shared successfully!' }));
            logger.info('[AppController] Shared via Web Share API.');
        } catch (error) {
            logger.error('[AppController] Error using Web Share API:', error);
            this.showToast(t('common.shareCancelled', { defaultValue: 'Sharing cancelled.' }), 'error');
        }
    } else {
        try {
            await navigator.clipboard.writeText(shareData.url);
            this.showToast(t('common.linkCopied', { defaultValue: 'Link copied to clipboard!' }));
            logger.info('[AppController] Web Share API not available. Copied link to clipboard.');
        } catch (error) {
            logger.error('[AppController] Failed to copy link to clipboard:', error);
            this.showToast(t('common.copyFailed', { defaultValue: 'Could not copy link.' }), 'error');
        }
    }
  }

  public updateGameControls(controls: GameControlsState): void {
    this.setState({ currentGameControls: controls });
  }

  public clearGameControls(): void {
    if (this.state.currentGameControls !== null) {
        this.setState({ currentGameControls: null });
    }
  }
  
  public async handleLanguageChange(lang: string): Promise<void> {
    await changeLang(lang);
  }

  public handleBoardChange(boardName: string): void {
    this.themeServiceInstance.setBoard(boardName);
    this.setState({ currentTheme: this.themeServiceInstance.getCurrentTheme() });
  }

  public handlePieceSetChange(pieceSetName: string): void {
    this.themeServiceInstance.setPieceSet(pieceSetName);
    this.setState({ currentTheme: this.themeServiceInstance.getCurrentTheme() });
  }

  public toggleDropdown(name: string | null): void {
    if (this.state.activeDropdown === name) {
      this.setState({ activeDropdown: null });
    } else {
      this.setState({ activeDropdown: name, engineSelectorOpen: false });
    }
  }
  
  public toggleEngineSelector(): void {
    const newOpenState = !this.state.engineSelectorOpen;
    this.setState({ 
        engineSelectorOpen: newOpenState,
        ...(newOpenState && { activeDropdown: null }) 
    });
  }

  public setEngine(engineId: EngineId): void {
    if (this.state.selectedEngine !== engineId) {
        this.setState({ selectedEngine: engineId });
        localStorage.setItem(ENGINE_STORAGE_KEY, engineId);
        logger.info(`[AppController] User selected new engine: ${engineId}`);
    }
  }

  private _handleRateLimitError(cooldownSeconds: number): void {
    logger.warn(`[AppController] Handling rate limit error. Cooldown: ${cooldownSeconds} seconds.`);
    
    this.setState({
        isRateLimited: true,
        isLoadingAuth: false,
        isModalVisible: true,
        modalMessage: t('errors.rateLimit.message', { seconds: cooldownSeconds })
    });
  }
  
  public handleApiRateLimit(error: unknown): boolean {
    if (error instanceof RateLimitError) {
      logger.warn(`[AppController] Central handler caught a RateLimitError. Cooldown: ${error.cooldownSeconds}s.`);
      this._handleRateLimitError(error.cooldownSeconds);
      return true;
    }
    return false;
  }
  
  public handleRateLimitModalOk(): void {
    logger.info('[AppController] Rate limit modal OK clicked.');
    if (this.rateLimitTimerId) {
        clearInterval(this.rateLimitTimerId);
        this.rateLimitTimerId = null;
    }
    this.setState({
      isRateLimited: false,
      rateLimitCooldownSeconds: 0,
      isModalVisible: false,
      modalMessage: null,
    });
    window.location.reload();
  }

  private _isInitializing: boolean = true;

  public async initializeApp(): Promise<void> {
    this._isInitializing = true;
    logger.info(`[AppController] Initializing app & authentication...`);
    this.setState({ isLoadingAuth: true });
    
    this.themeServiceInstance.applyTheme();
    this._checkForAppUpdate();
    
    await this.authServiceInstance.handleAuthentication();
    
    if (!this.authServiceInstance.getIsProcessing() && this.state.isLoadingAuth && !this.state.isRateLimited){
        this.setState({ isLoadingAuth: false });
    }

    this.unsubscribeFromRouteChange = this.routingService.listen((route) => this._processRouteChange(route));

    const authState = this.authServiceInstance.getState();
    if (authState.isAuthenticated) {
        const preAuthUrl = localStorage.getItem(PRE_AUTH_REDIRECT_URL_KEY);
        if (preAuthUrl) {
            logger.info(`[AppController] Found pre-auth redirect URL: ${preAuthUrl}. Navigating now.`);
            localStorage.removeItem(PRE_AUTH_REDIRECT_URL_KEY);
            window.location.hash = preAuthUrl;
        }
    }

    logger.info(`[AppController] App initialization sequence complete.`);
    this._calculateAndSetBoardSize();
    this._isInitializing = false;
  }

  private _onAuthStateChanged(): void {
    logger.info('[AppController] Auth state changed via subscription.');
    const authState = this.authServiceInstance.getState();

    this.setState({
        currentUser: authState.userProfile,
        isLoadingAuth: authState.isProcessing
    });

    if (authState.error && !this.state.isModalVisible) {
        this.showModal(authState.error);
    }
    
    if (!this._isInitializing && !authState.isAuthenticated && this.state.currentPage !== 'welcome') {
        logger.info('[AppController Subscriber] User logged out, navigating to welcome.');
        this.navigateTo('welcome');
    }
  }

  private _processRouteChange(route: Route): void {
      const isAuthenticated = this.authServiceInstance.getIsAuthenticated();
      let targetRoute = route;

      if (PRIVATE_PAGES.includes(route.page) && !isAuthenticated) {
          logger.warn(`[AppController] Access to private page '${route.page}' denied. Prompting for login.`);
          const redirectUrl = this.routingService.buildHash(route);
          if (redirectUrl !== '#') {
              localStorage.setItem(PRE_AUTH_REDIRECT_URL_KEY, redirectUrl);
          }
          
          this.showConfirmationModal(
              t('auth.loginRequiredForPage',{defaultValue: "To access this content, please log in with your Lichess account."}),
              () => this.services.authService.login(),
              () => this.navigateTo('welcome'),
              t('nav.loginWithLichess', {defaultValue: "Login with Lichess"}),
              t('common.cancel', {defaultValue: "Cancel"})
          );
          
          return;
      } 

      const { page: finalPage, clubId: finalClubId, puzzleId: finalPuzzleId, towerId: finalTowerId } = targetRoute;

      if (
          this.state.currentPage !== finalPage ||
          this.state.currentClubId !== finalClubId ||
          this.state.currentPuzzleId !== finalPuzzleId ||
          this.state.currentTowerId !== finalTowerId ||
          !this.activePageController
      ) {
          this._loadPage(targetRoute);
      }
  }

  private _loadPage(route: Route): void {
      if (this.activePageController?.destroy) this.activePageController.destroy();
      this.activePageController = null;
      if (this.analysisControllerInstance?.destroy) this.analysisControllerInstance.destroy();
      this.analysisControllerInstance = null;
      
      this.clearGameControls();

      this.setState({
          currentPage: route.page,
          currentClubId: route.clubId,
          currentPuzzleId: route.puzzleId,
          currentTowerId: route.towerId,
      });
      
      this._calculateAndSetBoardSize();

      let boardHandlerForPage: BoardHandler | undefined;
    
      if (['finishHim', 'tower', 'attack', 'tacktics'].includes(route.page)) {
          const redrawFn = () => this.setState({});
          boardHandlerForPage = new BoardHandler(this.services.chessboardService, redrawFn);
          this.analysisControllerInstance = new AnalysisController(this.services.analysisService, boardHandlerForPage, this.pgnServiceInstance, redrawFn);
      }
      
      switch (route.page) {
        case 'welcome':
          this.activePageController = new WelcomeController(this.authServiceInstance, () => this.setState({}));
          break;
        case 'finishHim':
          if (!boardHandlerForPage || !this.analysisControllerInstance) {
              if (this.state.currentPage !== 'welcome') this.navigateTo('welcome');
              return;
          }
          this.activePageController = new FinishHimController(
            this.services.chessboardService, boardHandlerForPage, this.authServiceInstance,
            this.webhookServiceInstance,
            this.analysisControllerInstance, this.services, () => this.setState({})
          );
          (this.activePageController as FinishHimController).initializeGame(route.puzzleId);
          break;
        case 'tower':
          if (!boardHandlerForPage || !this.analysisControllerInstance) {
              if (this.state.currentPage !== 'welcome') this.navigateTo('welcome');
              return;
          }
          this.activePageController = new TowerController(
              boardHandlerForPage, this.analysisControllerInstance, this.services, () => this.setState({})
          );
          (this.activePageController as TowerController).initialize(route.towerId);
          break;
        case 'attack':
          if (!boardHandlerForPage || !this.analysisControllerInstance) {
              if (this.state.currentPage !== 'welcome') this.navigateTo('welcome');
              return;
          }
          this.activePageController = new AttackController(
              boardHandlerForPage, this.analysisControllerInstance, this.services, () => this.setState({})
          );
          (this.activePageController as AttackController).initializeGame(route.puzzleId);
          break;
        case 'tacktics':
          if (!boardHandlerForPage || !this.analysisControllerInstance) {
              if (this.state.currentPage !== 'welcome') this.navigateTo('welcome');
              return;
          }
          this.activePageController = new TackticsController(
              boardHandlerForPage, this.analysisControllerInstance, this.services, () => this.setState({})
          );
          (this.activePageController as TackticsController).initializeGame(route.puzzleId);
          break;
        case 'clubPage':
          if (route.clubId) {
             this.activePageController = new ClubPageController(route.clubId, this.services, () => this.setState({}));
             (this.activePageController as ClubPageController).initializePage();
          } else {
              if (this.state.currentPage !== 'lichessClubs') this.navigateTo('lichessClubs');
          }
          break;
        case 'lichessClubs':
          this.activePageController = new LichessClubsController(this.services, () => this.setState({}));
          (this.activePageController as LichessClubsController).initializePage();
          break;
        case 'recordsPage':
          this.activePageController = new RecordsPageController(this.services, () => this.setState({}));
          (this.activePageController as RecordsPageController).initializePage();
          break;
        case 'userCabinet': 
          this.activePageController = new UserCabinetController(this.services, () => this.setState({}));
          (this.activePageController as UserCabinetController).initializePage();
          break;
        case 'about':
          this.activePageController = new AboutController();
          break;
        default:
          const exhaustiveCheck: never = route.page;
          logger.error(`[AppController] Reached default case in page switch with page: ${exhaustiveCheck}`);
          if (this.state.currentPage !== 'welcome') this.navigateTo('welcome');
          return; 
      }
      logger.info(`[AppController] Loaded controller for page: ${route.page}`, this.activePageController);
      this.setState({});
  }

  public navigateTo(page: AppPage, updateHash: boolean = true, clubId: string | null = null, puzzleId: string | null = null, towerId: string | null = null): void {
      const route: Route = { page, clubId, puzzleId, towerId };
      const currentHash = window.location.hash;
      const newHash = this.routingService.buildHash(route);

      if (currentHash !== newHash) {
          if (updateHash) {
              window.location.hash = newHash;
          }
      } else {
          this._processRouteChange(route);
      }
  }

  public updatePuzzleUrl(puzzleId: string): void {
    if (['finishHim', 'attack', 'tacktics'].includes(this.state.currentPage)) {
      this.setState({ currentPuzzleId: puzzleId });
      this.routingService.updateBrowserHash({ page: this.state.currentPage, puzzleId, clubId: null, towerId: null });
    }
  }

  public updateTowerUrl(towerId: string): void {
    if (this.state.currentPage === 'tower') {
      this.setState({ currentTowerId: towerId });
      this.routingService.updateBrowserHash({ page: 'tower', towerId, clubId: null, puzzleId: null });
    }
  }

  public getUserPreferredBoardSizeVh(): number {
    return this.userPreferredBoardSizeVh;
  }

  public setUserPreferredBoardSizeVh(newVh: number): void {
    const clampedVh = Math.max(BOARD_MIN_VH, Math.min(BOARD_MAX_VH, newVh));
    if (this.userPreferredBoardSizeVh !== clampedVh) {
      this.userPreferredBoardSizeVh = clampedVh;
      localStorage.setItem('userPreferredBoardSizeVh', this.userPreferredBoardSizeVh.toString());
      this._calculateAndSetBoardSize();
      this.setState({});
    }
  }

  private _getCssVariableInPixels(variableName: string): number {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    if (value.endsWith('px')) return parseFloat(value);
    return 0;
  }

  private _calculateAndSetBoardSize(): void {
    const viewportHeightPx = window.innerHeight;
    const viewportWidthPx = window.innerWidth;
    let currentBoardTargetSizePx = (this.userPreferredBoardSizeVh / 100) * viewportHeightPx;
    const minBoardSizeBasedOnMinVhPx = (BOARD_MIN_VH / 100) * viewportHeightPx;

    const leftPanelWidthPx = this._getCssVariableInPixels('--panel-width');
    const rightPanelWidthPx = this._getCssVariableInPixels('--panel-width');
    const panelGapPx = this._getCssVariableInPixels('--panel-gap');

    let availableWidthForCenterPx: number;

    if (this.state.isPortraitMode || !['finishHim', 'tower', 'attack', 'tacktics'].includes(this.state.currentPage)) {
      availableWidthForCenterPx = viewportWidthPx - (2 * panelGapPx);
    } else { 
      const actualLeftPanelWidth = document.getElementById('left-panel')?.offsetParent !== null ? leftPanelWidthPx : 0;
      const actualRightPanelWidth = document.getElementById('right-panel')?.offsetParent !== null ? rightPanelWidthPx : 0;
      
      let numberOfGaps = 0;
      if (actualLeftPanelWidth > 0) numberOfGaps++;
      if (actualRightPanelWidth > 0) numberOfGaps++;
      
      const totalSidePanelsWidth = actualLeftPanelWidth + actualRightPanelWidth;
      const totalGapsWidth = numberOfGaps * panelGapPx;
      const outerPagePadding = 2 * panelGapPx;

      availableWidthForCenterPx = viewportWidthPx - totalSidePanelsWidth - totalGapsWidth - outerPagePadding;
    }

    const minPracticalWidthPx = 50; 
    availableWidthForCenterPx = Math.max(availableWidthForCenterPx, minPracticalWidthPx);

    let finalBoardSizePx = Math.min(currentBoardTargetSizePx, availableWidthForCenterPx);
    finalBoardSizePx = Math.max(finalBoardSizePx, minBoardSizeBasedOnMinVhPx);

    const finalBoardSizeVh = (finalBoardSizePx / viewportHeightPx) * 100;

    document.documentElement.style.setProperty('--calculated-board-size-vh', `${finalBoardSizeVh.toFixed(3)}vh`);

    const resizeEvent = new CustomEvent('centerPanelResized', {
        detail: {
            widthPx: finalBoardSizePx,
            heightPx: finalBoardSizePx,
            widthVh: finalBoardSizeVh,
            heightVh: finalBoardSizeVh
        }
    });
    window.dispatchEvent(resizeEvent);
  }

  public toggleNav(): void {
    this.setState({isNavExpanded: !this.state.isNavExpanded});
  }

  public handleResize(): void {
    const newIsPortrait = window.matchMedia('(orientation: portrait)').matches;

    if (newIsPortrait !== this.state.isPortraitMode) {
      this.setState({isPortraitMode: newIsPortrait, isNavExpanded: false});
    }

    this._calculateAndSetBoardSize();
  }
  
  public showModal(message: string): void {
    this.setState({ isModalVisible: true, modalMessage: message });
  }

  public hideModal(): void {
    if (this.state.isRateLimited) {
      return;
    }
    this.setState({ isModalVisible: false, modalMessage: null });
    window.location.reload();
  }

  public showConfirmationModal(
    message: string, 
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ): void {
    this.setState({
      isConfirmationModalVisible: true,
      confirmationModalMessage: message,
      onConfirmAction: onConfirm,
      onCancelAction: onCancel || null,
      confirmButtonText: confirmText || null,
      cancelButtonText: cancelText || null,
    });
  }

  public handleConfirm(): void {
    if (this.state.onConfirmAction) {
      this.state.onConfirmAction();
    }
    this.setState({
      isConfirmationModalVisible: false,
      confirmationModalMessage: null,
      onConfirmAction: null,
      onCancelAction: null,
      confirmButtonText: null,
      cancelButtonText: null,
    });
  }

  public handleCancelConfirmation(): void {
    if (this.state.onCancelAction) {
      this.state.onCancelAction();
    }
    this.setState({
      isConfirmationModalVisible: false,
      confirmationModalMessage: null,
      onConfirmAction: null,
      onCancelAction: null,
      confirmButtonText: null,
      cancelButtonText: null,
    });
  }

  private setState(newState: Partial<AppControllerState>): void {
    const oldState = this.state;
    let hasDirectStateChange = false;

    for (const key in newState) {
        if (Object.prototype.hasOwnProperty.call(newState, key)) {
            const typedKey = key as keyof AppControllerState;
            if (oldState[typedKey] !== newState[typedKey]) {
                hasDirectStateChange = true;
                break;
            }
        }
    }

    this.state = { ...this.state, ...newState };

    const isChildRedrawRequest = Object.keys(newState).length === 0;

    if ((hasDirectStateChange || isChildRedrawRequest) && !this.isRedrawQueued) {
        this.isRedrawQueued = true;
        Promise.resolve().then(() => {
            this.requestGlobalRedraw();
            this.isRedrawQueued = false;
        });
    }
  }

  public destroy(): void {
    if (this.unsubscribeFromLangChange) this.unsubscribeFromLangChange();
    if (this.unsubscribeFromAuthChange) this.unsubscribeFromAuthChange();
    if (this.unsubscribeFromRouteChange) this.unsubscribeFromRouteChange();
    if (this.rateLimitTimerId) clearInterval(this.rateLimitTimerId);

    if (this.activePageController?.destroy) this.activePageController.destroy();
    if (this.analysisControllerInstance?.destroy) this.analysisControllerInstance.destroy();
    logger.info('[AppController] Destroyed.');
  }
}
