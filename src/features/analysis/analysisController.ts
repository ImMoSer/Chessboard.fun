// src/features/analysis/analysisController.ts
import { init, propsModule, eventListenersModule, styleModule, classModule, attributesModule } from 'snabbdom';
import type { VNode } from 'snabbdom';
import logger from '../../utils/logger';
import type { AnalysisService, EvaluatedLineWithSan } from '../../core/analysis.service';
import type { EvaluatedLine as ContinuousEvaluatedLine } from '../../core/stockfish-manager.service';
import type { BoardHandler } from '../../core/boardHandler';
import { PgnService, type PgnNode } from '../../core/pgn.service';
import type { Color as ChessopsColor } from 'chessops/types';
import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
import { parseUci } from 'chessops/util';
import { makeSan } from 'chessops/san';
import type { Key } from 'chessground/types';
import type { CustomDrawShape } from '../../core/chessboard.service';
import { t } from '../../core/i18n.service';
import type { AnalysisUpdateCallback } from '../../core/stockfish-manager.service';
import { renderAnalysisPanel } from './analysisPanelView';

const ARROW_STYLES = [
  { brush: 'blue', lineWidth: 15 }, 
  { brush: 'green', lineWidth: 9 }, 
  { brush: 'yellow', lineWidth: 5 },  
];
const LINES_STORAGE_KEY = 'stockfish_analysis_lines';
const THREADS_STORAGE_KEY = 'stockfish_analysis_threads';
const MAX_THREADS_LIMIT = 8;

export interface AnalysisPanelState {
  isAnalysisActive: boolean;
  isAnalysisLoading: boolean;
  analysisLines: EvaluatedLineWithSan[] | null;
  canNavigatePgnBackward: boolean;
  canNavigatePgnForward: boolean;
  currentFenAnalyzed: string | null;
  currentTurnForAnalysis: ChessopsColor | null;
  pgnRootNode: PgnNode | null;
  currentPgnPath: string | null;
  numLines: number;
  numThreads: number;
  maxThreads: number;
}

export class AnalysisController {
  private analysisService: AnalysisService;
  private boardHandler: BoardHandler;
  private pgnServiceInstance: typeof PgnService;

  private patch = init([propsModule, eventListenersModule, styleModule, classModule, attributesModule]);
  private panelVNode: VNode | Element | null = null;
  private isUpdateScheduled = false;
  private latestAnalysisData: ContinuousEvaluatedLine[] | null = null;
  
  private panelState: AnalysisPanelState;
  private currentFenForAnalysis: string | null = null;
  private currentAnalysisNodePath: string | null = null;
  private wheelNavThrottleTimeout: number | null = null;
  private boundBoardWheelHandler: ((event: WheelEvent) => void) | null = null;
  
  private sanCache = new Map<string, { pvSan: string[], initialFullMoveNumber: number, initialTurn: ChessopsColor }>();

  private unsubscribeFromMoveMade: (() => void) | null = null;
  private unsubscribeFromPgnNavigated: (() => void) | null = null;

  constructor(
    analysisService: AnalysisService,
    boardHandler: BoardHandler,
    pgnServiceInstance: typeof PgnService,
  ) {
    this.analysisService = analysisService;
    this.boardHandler = boardHandler;
    this.pgnServiceInstance = pgnServiceInstance;

    const savedLines = localStorage.getItem(LINES_STORAGE_KEY);
    const savedThreads = localStorage.getItem(THREADS_STORAGE_KEY);
    const maxThreads = Math.min(this.analysisService.getMaxThreads(), MAX_THREADS_LIMIT);
    const defaultThreads = maxThreads > 2 ? 2 : 1;

    this.panelState = {
      isAnalysisActive: false,
      isAnalysisLoading: false,
      analysisLines: null,
      canNavigatePgnBackward: false,
      canNavigatePgnForward: false,
      currentFenAnalyzed: null,
      currentTurnForAnalysis: null,
      pgnRootNode: null,
      currentPgnPath: null,
      numLines: savedLines ? parseInt(savedLines, 10) : 3,
      numThreads: savedThreads ? parseInt(savedThreads, 10) : defaultThreads,
      maxThreads: maxThreads,
    };

    this.unsubscribeFromMoveMade = this.boardHandler.onMoveMade(this._handleBoardOrPgnChange.bind(this));
    this.unsubscribeFromPgnNavigated = this.boardHandler.onPgnNavigated(this._handleBoardOrPgnChange.bind(this));

    logger.info('[AnalysisController] Initialized with local rendering.');
  }

  public setContainer(element: HTMLElement): void {
      if (this.panelVNode) {
          logger.warn('[AnalysisController] Container is already set.');
          return;
      }
      this.panelVNode = element;
      this.redraw();
  }

  private redraw(): void {
      if (!this.panelVNode) return;
      const newVNode = renderAnalysisPanel(this);
      this.panelVNode = this.patch(this.panelVNode, newVNode);
  }

  public isPromotionActive(): boolean {
    return this.boardHandler.promotionCtrl.isActive();
  }

  public getPanelState(): AnalysisPanelState {
    const isAnalysisActive = this.panelState.isAnalysisActive;
    this.panelState.canNavigatePgnBackward = isAnalysisActive && this.pgnServiceInstance.canNavigateBackward();
    this.panelState.canNavigatePgnForward = isAnalysisActive && this.pgnServiceInstance.canNavigateForward(0);
    this.panelState.currentFenAnalyzed = this.currentFenForAnalysis;
    this.panelState.pgnRootNode = isAnalysisActive ? this.pgnServiceInstance.getRootNode() : null;
    this.panelState.currentPgnPath = isAnalysisActive ? this.pgnServiceInstance.getCurrentPath() : null;

    if (this.currentFenForAnalysis) {
        try {
            const setup = parseFen(this.currentFenForAnalysis).unwrap();
            this.panelState.currentTurnForAnalysis = setup.turn;
        } catch (e) {
            logger.warn(`[AnalysisController getPanelState] Could not parse FEN ${this.currentFenForAnalysis} to determine turn.`);
            this.panelState.currentTurnForAnalysis = null;
        }
    } else {
        this.panelState.currentTurnForAnalysis = null;
    }
    return { ...this.panelState };
  }

  public toggleAnalysisEngine(): void {
    if (this.isPromotionActive()) {
      logger.warn("[AnalysisController] Cannot toggle analysis during promotion.");
      return;
    }

    if (this.panelState.isAnalysisActive) {
      this._internalStopAnalysis(true);
    } else {
      this._internalStartAnalysis();
    }
    this.redraw();
  }

  private _internalStartAnalysis(nodePath?: string): void {
    if (this.isPromotionActive()) {
        logger.warn("[AnalysisController] Cannot start analysis during promotion.");
        return;
    }

    logger.info(`[AnalysisController] Starting analysis internally. Requested nodePath: ${nodePath}`);
    this.panelState.isAnalysisActive = true;
    this.boardHandler.configureBoardForAnalysis(true);

    const groundEl = this.boardHandler.getBoardElement();
    if (groundEl) {
        this.boundBoardWheelHandler = this.handlePgnNavViaWheel.bind(this);
        groundEl.addEventListener('wheel', this.boundBoardWheelHandler, { passive: false });
        logger.info('[AnalysisController] Added wheel event listener to the board for PGN navigation.');
    }

    const pathToAnalyze = nodePath || this.pgnServiceInstance.getCurrentPath();
    this.currentAnalysisNodePath = pathToAnalyze;

    const pgnNode = this._getNodeByPath(pathToAnalyze);
    this.currentFenForAnalysis = pgnNode ? pgnNode.fenAfter : this.boardHandler.getFen();
    
    if (this.currentFenForAnalysis) {
      this._requestAndProcessContinuousAnalysis();
    } else {
      logger.error('[AnalysisController] Cannot start analysis, no valid FEN found.');
      this.panelState.isAnalysisActive = false;
      this.boardHandler.configureBoardForAnalysis(false);
    }
  }

  private async _internalStopAnalysis(configureBoard: boolean): Promise<void> {
    logger.info('[AnalysisController] Stopping analysis internally.');
    this.panelState.isAnalysisActive = false;
    this.panelState.isAnalysisLoading = false;
    this.isUpdateScheduled = false;

    const groundEl = this.boardHandler.getBoardElement();
    if (groundEl && this.boundBoardWheelHandler) {
        groundEl.removeEventListener('wheel', this.boundBoardWheelHandler);
        this.boundBoardWheelHandler = null;
        logger.info('[AnalysisController] Removed wheel event listener from the board.');
    }

    await this.analysisService.stopContinuousAnalysis();

    if (configureBoard) {
        if (this.boardHandler.isBoardConfiguredForAnalysis()){
            this.boardHandler.configureBoardForAnalysis(false);
        }
    }
    this.boardHandler.clearAllDrawings();
    this.panelState.analysisLines = null;
  }

  private _handleBoardOrPgnChange(data: { currentNodePath?: string; currentFen?: string; newNodePath?: string; newFen?: string }): void {
    if (!this.panelState.isAnalysisActive) {
      this.redraw();
      return;
    }

    const path = data.currentNodePath ?? data.newNodePath;
    const fen = data.currentFen ?? data.newFen;

    if (path === undefined || fen === undefined) {
        logger.warn('[AnalysisController _handleBoardOrPgnChange] Path or FEN missing in event data.');
        this.redraw();
        return;
    }

    if (path !== this.currentAnalysisNodePath || fen !== this.currentFenForAnalysis) {
      this.currentAnalysisNodePath = path;
      this.currentFenForAnalysis = fen;
      this._requestAndProcessContinuousAnalysis();
    } else {
      this.redraw();
    }
  }

  private async _requestAndProcessContinuousAnalysis(): Promise<void> {
    if (!this.panelState.isAnalysisActive || !this.currentFenForAnalysis) {
      return;
    }

    this.panelState.isAnalysisLoading = true;
    this.panelState.analysisLines = null;
    this.redraw();

    this.boardHandler.clearAllDrawings();
    const fenForAnalysis = this.currentFenForAnalysis;

    const analysisUpdateCallback: AnalysisUpdateCallback = (updatedLines, _bestMoveUci) => {
        if (!this.panelState.isAnalysisActive || this.currentFenForAnalysis !== fenForAnalysis) {
            return;
        }
        this.latestAnalysisData = updatedLines;
        this._schedulePanelUpdate();
    };

    try {
        await this.analysisService.startContinuousAnalysis(fenForAnalysis, this.panelState.numLines, analysisUpdateCallback);
    } catch (error: any) {
        logger.error(`[AnalysisController] Error starting continuous analysis:`, error.message);
        if (this.panelState.isAnalysisActive && this.currentFenForAnalysis === fenForAnalysis) {
            this.panelState.isAnalysisLoading = false;
            this.panelState.analysisLines = [{
                id: 0, depth: 0, score: {type: 'cp', value:0},
                pvUci: ['error'], pvSan: [t('analysis.errorStarting')],
                startingFen: fenForAnalysis,
                initialFullMoveNumber: 1, initialTurn: 'white' as ChessopsColor
            }];
            this.redraw();
        }
    }
  }

  private _schedulePanelUpdate(): void {
    if (this.isUpdateScheduled) {
      return;
    }
    this.isUpdateScheduled = true;
    requestAnimationFrame(() => this._processScheduledUpdate());
  }

  private _processScheduledUpdate(): void {
    this.isUpdateScheduled = false;

    if (!this.panelState.isAnalysisActive || !this.latestAnalysisData) {
      return;
    }

    if (this.panelState.isAnalysisLoading) {
      this.panelState.isAnalysisLoading = false;
    }

    const linesWithSan = this._prepareLinesForDisplay(this.latestAnalysisData, this.currentFenForAnalysis!);
    this.panelState.analysisLines = linesWithSan;
    this._drawAnalysisResultOnBoard(linesWithSan);

    this.redraw();

    this.latestAnalysisData = null;
  }

  private _prepareLinesForDisplay(lines: ContinuousEvaluatedLine[], fen: string): EvaluatedLineWithSan[] {
    const turn = parseFen(fen).unwrap().turn;
    return lines.map((line) => {
        const conversionResult = this._convertUciToSanForLine(fen, line.pvUci);
        let correctedScore = line.score;
        if (turn === 'black') {
            correctedScore = { ...line.score, value: -line.score.value };
        }
        return {
            ...line,
            startingFen: fen,
            score: correctedScore,
            ...conversionResult,
        };
    });
  }

  private _convertUciToSanForLine(fen: string, pvUci: string[]): { pvSan: string[], initialFullMoveNumber: number, initialTurn: ChessopsColor } {
    const cacheKey = `${fen}|${pvUci.join(' ')}`;
    if (this.sanCache.has(cacheKey)) {
        return this.sanCache.get(cacheKey)!;
    }

    const sanMoves: string[] = [];
    let initialFullMoveNumber = 1;
    let initialTurn: ChessopsColor = 'white';

    try {
      const setup = parseFen(fen).unwrap();
      const pos = Chess.fromSetup(setup).unwrap();
      initialFullMoveNumber = pos.fullmoves;
      initialTurn = pos.turn;

      for (const uciMove of pvUci) {
        const move = parseUci(uciMove);
        if (move && pos.isLegal(move)) {
          sanMoves.push(makeSan(pos, move));
          pos.play(move);
        } else {
          break;
        }
      }
    } catch (e: any) {
      logger.error('[AnalysisController] Error converting UCI to SAN:', e.message);
      return { pvSan: [], initialFullMoveNumber: 1, initialTurn: 'white' };
    }
    
    const result = { pvSan: sanMoves, initialFullMoveNumber, initialTurn };
    this.sanCache.set(cacheKey, result);
    return result;
  }

  private _drawAnalysisResultOnBoard(lines: EvaluatedLineWithSan[]): void {
    if (!this.panelState.isAnalysisActive && !this.panelState.analysisLines) {
        this.boardHandler.clearAllDrawings();
        return;
    }
    
    const linesToDraw = this.panelState.analysisLines || lines;

    if (!linesToDraw || linesToDraw.length === 0) {
        this.boardHandler.clearAllDrawings();
        return;
    }

    const shapesToDraw: CustomDrawShape[] = [];
    linesToDraw.slice(0, 3).forEach((line, index) => {
      if (line.pvUci && line.pvUci.length > 0) {
        const uciMove = line.pvUci[0];
        if (typeof uciMove === 'string' && uciMove.length >= 4) {
            const orig = uciMove.substring(0, 2) as Key;
            const dest = uciMove.substring(2, 4) as Key;
            const style = ARROW_STYLES[index];
            if (style) {
                shapesToDraw.push({ orig, dest, brush: style.brush, modifiers: { lineWidth: style.lineWidth } });
            }
        }
      }
    });

    this.boardHandler.setDrawableShapes(shapesToDraw);
  }

  private _getNodeByPath(path: string): PgnNode | null {
    if (path === "") return this.pgnServiceInstance.getRootNode();
    const originalPath = this.pgnServiceInstance.getCurrentPath();
    let node: PgnNode | null = null;
    if (this.pgnServiceInstance.navigateToPath(path)) {
        node = this.pgnServiceInstance.getCurrentNode();
    }
    if (this.pgnServiceInstance.getCurrentPath() !== originalPath) {
        this.pgnServiceInstance.navigateToPath(originalPath);
    }
    return node;
  }

  public pgnNavigateToStart(): void { if (this.panelState.isAnalysisActive) this.boardHandler.handleNavigatePgnToStart(); }
  public pgnNavigateBackward(): void { if (this.panelState.isAnalysisActive) this.boardHandler.handleNavigatePgnBackward(); }
  public pgnNavigateForward(variationIndex: number = 0): void { if (this.panelState.isAnalysisActive) this.boardHandler.handleNavigatePgnForward(variationIndex); }
  public pgnNavigateToEnd(): void { if (this.panelState.isAnalysisActive) this.boardHandler.handleNavigatePgnToEnd(); }
  public handlePgnMoveClick(path: string): void { if (this.panelState.isAnalysisActive) this.boardHandler.handleNavigatePgnToPath(path); }

  public handlePgnNavViaWheel(event: WheelEvent): void {
    if (!this.panelState.isAnalysisActive || this.wheelNavThrottleTimeout) return;
    event.preventDefault();
    if (event.deltaY > 0) this.boardHandler.handleNavigatePgnForward();
    else if (event.deltaY < 0) this.boardHandler.handleNavigatePgnBackward();
    this.wheelNavThrottleTimeout = window.setTimeout(() => { this.wheelNavThrottleTimeout = null; }, 100); 
  }

  public playMoveFromAnalysisLine(uciMove: string): void {
    if (!this.panelState.analysisLines || this.currentAnalysisNodePath === null) return;
    if (this.pgnServiceInstance.getCurrentPath() !== this.currentAnalysisNodePath) {
        this.boardHandler.handleNavigatePgnToPath(this.currentAnalysisNodePath);
    }
    this.boardHandler.applySystemMove(uciMove);
  }

  private async _handleSettingChange(): Promise<void> {
    if (this.panelState.isAnalysisActive) {
      logger.info('[AnalysisController] Setting changed during active analysis. Restarting analysis...');
      await this.analysisService.stopContinuousAnalysis();
      this._requestAndProcessContinuousAnalysis();
    }
    this.redraw();
  }

  public setNumLines(lines: number): void {
    const num = Math.max(1, Math.min(lines, 3));
    if (this.panelState.numLines === num) return;
    
    this.panelState.numLines = num;
    localStorage.setItem(LINES_STORAGE_KEY, String(num));
    this.analysisService.setInfiniteAnalysisOption('MultiPV', num);
    logger.info(`[AnalysisController] Number of analysis lines set to: ${num}`);
    this._handleSettingChange();
  }

  public setNumThreads(threads: number): void {
    const num = Math.max(1, Math.min(threads, this.panelState.maxThreads));
    if (this.panelState.numThreads === num) return;

    this.panelState.numThreads = num;
    localStorage.setItem(THREADS_STORAGE_KEY, String(num));
    this.analysisService.setInfiniteAnalysisOption('Threads', num);
    logger.info(`[AnalysisController] Number of analysis threads set to: ${num}`);
    this._handleSettingChange();
  }

  public destroy(): void {
    logger.info('[AnalysisController] Destroying AnalysisController instance.');
    
    this._internalStopAnalysis(false); 

    if (this.wheelNavThrottleTimeout) {
      clearTimeout(this.wheelNavThrottleTimeout);
      this.wheelNavThrottleTimeout = null;
    }

    if (this.unsubscribeFromMoveMade) {
      this.unsubscribeFromMoveMade();
      this.unsubscribeFromMoveMade = null;
    }
    if (this.unsubscribeFromPgnNavigated) {
      this.unsubscribeFromPgnNavigated();
      this.unsubscribeFromPgnNavigated = null;
    }

    this.sanCache.clear();
    logger.info('[AnalysisController] Successfully destroyed and cleaned up resources.');
  }
}
