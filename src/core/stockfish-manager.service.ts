// src/core/stockfish-manager.service.ts
import logger from '../utils/logger';
import { loadEngine, type EngineController } from './engine.loader';

// --- Interfaces (unified from old services) ---

export interface ScoreInfo {
  type: 'cp' | 'mate';
  value: number;
}

export interface EvaluatedLine {
  id: number;
  depth: number;
  score: ScoreInfo;
  pvUci: string[];
}

export interface AnalysisResult {
  bestMoveUci: string | null;
  evaluatedLines: EvaluatedLine[];
}

export interface AnalysisOptions {
  depth?: number;
  movetime?: number;
  lines?: number;
}

export type AnalysisUpdateCallback = (lines: EvaluatedLine[], bestMoveUci?: string | null) => void;

type AnalysisResolve = (value: AnalysisResult | null) => void;
type AnalysisReject = (reason?: any) => void;

interface PendingRequest {
  resolve: AnalysisResolve;
  reject: AnalysisReject;
  timeoutId: number;
  collectedLines: Map<number, EvaluatedLine>;
}

/**
 * A singleton service to manage a single, lazily-loaded instance of the Stockfish engine.
 * This replaces the two separate, eagerly-loaded stockfish services.
 */
class StockfishManagerController {
  private engine: EngineController | null = null;
  private isReady: boolean = false;
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;
  private commandQueue: string[] = [];
  
  private currentFen: string | null = null;
  private currentMode: 'gameplay' | 'analysis' | 'idle' = 'idle';

  // For gameplay/getAnalysis
  private pendingRequest: PendingRequest | null = null;

  // For infinite analysis
  private infiniteAnalysisCallback: AnalysisUpdateCallback | null = null;
  private isInfiniteAnalyzing: boolean = false;
  
  constructor() {
    logger.info('[StockfishManager] Service created. Engine will be loaded on demand.');
  }

  /**
   * Ensures the engine is loaded and ready. This is the main entry point for lazy loading.
   */
  public async ensureReady(): Promise<void> {
    if (this.isReady) {
      return;
    }
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }
    this.isInitializing = true;
    this.initPromise = this._initEngine();
    return this.initPromise;
  }

  private async _initEngine(): Promise<void> {
    try {
      logger.info(`[StockfishManager] Lazy loading engine...`);
      this.engine = await loadEngine();
      this.engine.addMessageListener((message: string) => this.handleEngineMessage(message));
      this.sendCommand('uci');

      // UCI handshake timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('UCI handshake timeout for StockfishManager'));
        }, 15000);
        
        const checkReady = () => {
          if (this.isReady) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });

    } catch (error: any) {
      logger.error('[StockfishManager] Failed to initialize engine:', error.message, error);
      this.isInitializing = false;
      this.initPromise = null;
      throw error; // Re-throw to let consumers know it failed
    }
  }

  private sendCommand(command: string): void {
    if (!this.engine) {
        logger.warn('[StockfishManager] Engine not loaded, cannot send command:', command);
        return;
    }
    if (!this.isReady && command !== 'uci') {
      this.commandQueue.push(command);
      return;
    }
    logger.debug(`[StockfishManager] Sending to Stockfish: ${command}`);
    this.engine.postMessage(command);
  }

  private processCommandQueue(): void {
    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift();
      if (command) {
        this.sendCommand(command);
      }
    }
  }

  private handleEngineMessage(message: string): void {
    logger.debug(`[StockfishManager] Received: ${message}`);
    const parts = message.split(' ');

    if (message === 'uciok') {
      logger.info('[StockfishManager] UCI OK received.');
      this.sendCommand('isready');
    } else if (message === 'readyok') {
      this.isReady = true;
      this.isInitializing = false;
      logger.info('[StockfishManager] Engine is ready.');
      this.processCommandQueue();
    } else if (parts[0] === 'info') {
      this.parseInfoLine(message);
    } else if (parts[0] === 'bestmove') {
      const bestMoveUci = (parts[1] && parts[1] !== '(none)') ? parts[1] : null;
      this.handleBestMove(bestMoveUci);
    }
  }

  private parseInfoLine(line: string): void {
    if (this.currentMode === 'idle') return;

    try {
      let currentLineId = 1;
      let depth = 0;
      let score: ScoreInfo | null = null;
      let pvUci: string[] = [];
      const parts = line.split(' ');
      let i = 0;
      while (i < parts.length) {
        const token = parts[i];
        switch (token) {
          case 'depth': depth = parseInt(parts[++i], 10); break;
          case 'multipv': currentLineId = parseInt(parts[++i], 10); break;
          case 'score':
            const type = parts[++i] as 'cp' | 'mate';
            const value = parseInt(parts[++i], 10);
            if ((type === 'cp' || type === 'mate') && !isNaN(value)) {
              score = { type, value };
            } else { i--; }
            break;
          case 'pv': pvUci = parts.slice(i + 1); i = parts.length; break;
        }
        i++;
      }

      if (score && pvUci.length > 0 && !isNaN(depth) && depth > 0) {
        const newLine: EvaluatedLine = { id: currentLineId, depth, score, pvUci };
        
        if (this.isInfiniteAnalyzing && this.infiniteAnalysisCallback) {
            // In infinite mode, we don't collect, we just callback
            this.infiniteAnalysisCallback([newLine], null);
        } else if (this.pendingRequest) {
            // In gameplay mode, we collect the best line
            const existingLine = this.pendingRequest.collectedLines.get(currentLineId);
            if (!existingLine || depth >= existingLine.depth) {
                this.pendingRequest.collectedLines.set(currentLineId, newLine);
            }
        }
      }
    } catch (error) {
      logger.warn('[StockfishManager] Error parsing info line:', line, error);
    }
  }

  private handleBestMove(bestMoveUci: string | null): void {
    if (this.pendingRequest) {
        clearTimeout(this.pendingRequest.timeoutId);
        const result: AnalysisResult = {
            bestMoveUci,
            evaluatedLines: Array.from(this.pendingRequest.collectedLines.values())
        };
        this.pendingRequest.resolve(result);
        this.pendingRequest = null;
        this.currentMode = 'idle';
    }
    if (this.isInfiniteAnalyzing && this.infiniteAnalysisCallback) {
        this.infiniteAnalysisCallback([], bestMoveUci);
        // Note: isInfiniteAnalyzing is reset by stopAnalysis()
    }
  }

  public async getAnalysis(fen: string, options: AnalysisOptions = {}): Promise<AnalysisResult | null> {
    await this.ensureReady();
    if (this.currentMode !== 'idle') {
        logger.warn(`[StockfishManager] getAnalysis called while busy with mode: ${this.currentMode}. Aborting.`);
        return null;
    }
    this.currentMode = 'gameplay';

    return new Promise<AnalysisResult | null>((resolve, reject) => {
        const timeoutDuration = (options.movetime || 2000) + 3000;
        this.pendingRequest = {
            resolve,
            reject,
            timeoutId: window.setTimeout(() => {
                logger.warn(`[StockfishManager] getAnalysis timed out for FEN: ${fen}`);
                this.sendCommand('stop');
                reject(new Error('Stockfish analysis timeout'));
                this.pendingRequest = null;
                this.currentMode = 'idle';
            }, timeoutDuration),
            collectedLines: new Map(),
        };

        if (this.currentFen !== fen) {
            this.sendCommand('ucinewgame');
            this.currentFen = fen;
        }
        this.setOption('MultiPV', options.lines || 1);
        this.sendCommand(`position fen ${fen}`);
        const goCommand = `go ${options.depth ? `depth ${options.depth}` : ''} ${options.movetime ? `movetime ${options.movetime}` : ''}`.trim();
        this.sendCommand(goCommand || 'go depth 10');
    });
  }

  public async getBestMoveOnly(fen: string, options: { depth?: number; movetime?: number } = {}): Promise<string | null> {
    const result = await this.getAnalysis(fen, options);
    return result?.bestMoveUci || null;
  }

  public async startAnalysis(fen: string, callback: AnalysisUpdateCallback): Promise<void> {
    await this.ensureReady();
    if (this.currentMode !== 'idle') {
      await this.stopAnalysis();
    }
    this.currentMode = 'analysis';
    this.isInfiniteAnalyzing = true;
    this.infiniteAnalysisCallback = callback;
    
    if (this.currentFen !== fen) {
        this.sendCommand('ucinewgame');
        this.currentFen = fen;
    }
    this.sendCommand(`position fen ${fen}`);
    this.sendCommand('go infinite');
  }

  public async stopAnalysis(): Promise<void> {
    if (!this.isInfiniteAnalyzing) return;
    this.isInfiniteAnalyzing = false;
    this.infiniteAnalysisCallback = null;
    this.currentMode = 'idle';
    this.sendCommand('stop');
  }

  public async setOption(name: string, value: string | number): Promise<void> {
    await this.ensureReady();
    this.sendCommand(`setoption name ${name} value ${value}`);
  }

  public getMaxThreads(): number {
    return navigator.hardwareConcurrency || 16;
  }

  public async terminate(): Promise<void> {
    if (this.engine) {
      logger.info('[StockfishManager] Terminating engine...');
      this.engine.postMessage('quit');
      this.engine = null;
    }
    this.isReady = false;
    this.isInitializing = false;
    this.initPromise = null;
    this.commandQueue = [];
    if (this.pendingRequest) {
        clearTimeout(this.pendingRequest.timeoutId);
        this.pendingRequest.reject(new Error('Engine terminated'));
        this.pendingRequest = null;
    }
  }
}

export const StockfishManager = new StockfishManagerController();
