// src/core/stockfish.service.ts
import logger from '../utils/logger';
import { loadEngine, type EngineController } from './engine.loader';

const MOVE_RESPONSE_DELAY_MS = 100;

// Interfaces for analysis data
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
}

type AnalysisResolve = (value: AnalysisResult | null) => void;
type AnalysisReject = (reason?: any) => void;

interface PendingAnalysisRequest {
  resolve: AnalysisResolve;
  reject: AnalysisReject;
  timeoutId: number;
  fen: string;
  options: AnalysisOptions;
  collectedLines: Map<number, EvaluatedLine>;
  currentBestMove: string | null;
  isActive: boolean;
}

export class StockfishService {
  private engine: EngineController | null = null;
  private isReady: boolean = false;
  private commandQueue: string[] = [];
  private initPromise: Promise<void>;
  private resolveInitPromise!: () => void;
  private rejectInitPromise!: (reason?: any) => void;

  private pendingAnalysisRequest: PendingAnalysisRequest | null = null;

  // UCI options for gameplay: 1 thread, default aggressive behavior (AnalyseMode is false by default)
  private readonly UCI_OPTIONS_FOR_GAMEPLAY = [
    'setoption name Threads value 1',
  ];

  constructor() {
    this.initPromise = new Promise<void>((resolve, reject) => {
      this.resolveInitPromise = resolve;
      this.rejectInitPromise = reject;
    });
    this.initEngine();
  }

  private async initEngine(): Promise<void> {
    if (this.engine) {
      await this.terminate();
    }

    try {
      logger.info(`[StockfishService gameplay] Loading engine via universal loader...`);
      this.engine = await loadEngine();

      this.engine.addMessageListener((message: string) => {
        this.handleEngineMessage(message);
      });

      this.sendCommand('uci');

      setTimeout(() => {
        if (!this.isReady) {
            const errorMsg = 'UCI handshake timeout for StockfishService (gameplay)';
            logger.error(`[StockfishService gameplay] ${errorMsg}`);
            if (this.rejectInitPromise) {
                try { this.rejectInitPromise(new Error(errorMsg)); } catch(e) { /* ignore */ }
            }
        }
      }, 15000);

    } catch (error: any) {
      logger.error('[StockfishService gameplay] Failed to initialize engine (loader error):', error.message, error);
      this.isReady = false;
      if (this.rejectInitPromise) {
          try { this.rejectInitPromise(error); } catch(e) { /* ignore */ }
      }
    }
  }

  private sendCommand(command: string): void {
    if (this.engine) {
      if (command !== 'uci' && command !== 'isready' && !this.isReady) {
        logger.debug(`[StockfishService gameplay] Engine not ready, queuing command: ${command}`);
        this.commandQueue.push(command);
        return;
      }
      logger.debug(`[StockfishService gameplay] Sending to Stockfish: ${command}`);
      this.engine.postMessage(command);
    } else {
      logger.warn('[StockfishService gameplay] Engine not initialized, cannot send command:', command);
    }
  }

  private processCommandQueue(): void {
    logger.debug(`[StockfishService gameplay] Processing command queue (${this.commandQueue.length} items)`);
    while(this.commandQueue.length > 0) {
        const command = this.commandQueue.shift();
        if (command) {
            if (this.isReady) {
                 this.sendCommand(command);
            } else {
                logger.warn(`[StockfishService gameplay] Engine not ready during queue processing, re-queuing: ${command}`);
                this.commandQueue.unshift(command);
                break;
            }
        }
    }
  }

  private handleEngineMessage(message: string): void {
    logger.debug(`[StockfishService gameplay] Received from Stockfish: ${message}`);
    const parts = message.split(' ');

    if (message === 'uciok') {
      logger.info('[StockfishService gameplay] UCI OK received.');
      this.UCI_OPTIONS_FOR_GAMEPLAY.forEach(optionCmd => this.sendCommand(optionCmd));
      this.sendCommand('isready');
    } else if (message === 'readyok') {
      this.isReady = true;
      logger.info('[StockfishService gameplay] Engine is ready (readyok received).');
      if (this.resolveInitPromise) {
        try { this.resolveInitPromise(); } catch(e) { /* Promise might already be settled */ }
      }
      this.processCommandQueue();
    } else if (parts[0] === 'info' && this.pendingAnalysisRequest && this.pendingAnalysisRequest.isActive) {
      this.parseInfoLineForGameplay(message, this.pendingAnalysisRequest.collectedLines);
    } else if (parts[0] === 'bestmove') {
      if (this.pendingAnalysisRequest && this.pendingAnalysisRequest.isActive) {
            clearTimeout(this.pendingAnalysisRequest.timeoutId);
            const bestMoveUci = (parts[1] && parts[1] !== '(none)') ? parts[1] : null;
            this.pendingAnalysisRequest.currentBestMove = bestMoveUci;

            const result: AnalysisResult = {
              bestMoveUci: this.pendingAnalysisRequest.currentBestMove,
              evaluatedLines: this.pendingAnalysisRequest.collectedLines.has(1) ? [this.pendingAnalysisRequest.collectedLines.get(1)!] : []
            };

            const requestObject = this.pendingAnalysisRequest;
            this.pendingAnalysisRequest = null;

            setTimeout(() => {
                logger.info('[StockfishService gameplay] Analysis complete. Best move:', bestMoveUci);
                try { requestObject.resolve(result); } catch(e) { /* Promise might already be settled */ }
            }, MOVE_RESPONSE_DELAY_MS);
      } else {
        logger.warn('[StockfishService gameplay] Received bestmove but no active pending analysis request.');
      }
    }
  }

  private parseInfoLineForGameplay(line: string, collectedLines: Map<number, EvaluatedLine>): void {
    try {
      const parts = line.split(' ');
      let multipvValue = 1;
      let depth = 0;
      let score: ScoreInfo | null = null;
      let pvUci: string[] = [];
      let i = 0;

      const multipvIndex = parts.indexOf('multipv');
      if (multipvIndex !== -1 && parts.length > multipvIndex + 1) {
        multipvValue = parseInt(parts[multipvIndex + 1], 10);
        if (multipvValue !== 1) {
          return;
        }
      }

      while (i < parts.length) {
        const token = parts[i];
        switch (token) {
          case 'depth': depth = parseInt(parts[++i], 10); break;
          case 'score':
            const type = parts[++i];
            const value = parseInt(parts[++i], 10);
            if (type === 'cp' || type === 'mate') score = { type, value };
            break;
          case 'pv': pvUci = parts.slice(i + 1); i = parts.length; break;
        }
        i++;
      }
      if (score && pvUci.length > 0 && !isNaN(depth) && depth > 0) {
        const existingLine = collectedLines.get(1);
        if (!existingLine || depth >= existingLine.depth) {
             collectedLines.set(1, { id: 1, depth, score, pvUci });
        }
      }
    } catch (error) {
      logger.warn('[StockfishService gameplay] Error parsing info line:', line, error);
    }
  }

  public async ensureReady(): Promise<void> {
    if (this.isReady) return Promise.resolve();
    if (!this.engine) {
        await this.initEngine();
    }
    return this.initPromise;
  }

  public async getAnalysis(fen: string, options: AnalysisOptions = {}): Promise<AnalysisResult | null> {
    try {
      await this.ensureReady();
    } catch (error) {
      logger.error('[StockfishService gameplay] Engine failed to initialize for getAnalysis:', error);
      return Promise.reject(error);
    }

    if (!this.engine) {
        const engineError = new Error('Engine not available for getAnalysis (gameplay).');
        logger.error(`[StockfishService gameplay] ${engineError.message}`);
        return Promise.reject(engineError);
    }

    if (this.pendingAnalysisRequest && this.pendingAnalysisRequest.isActive) {
        logger.warn('[StockfishService gameplay] New analysis request received while previous one is pending. Superseding previous request.');
        this.pendingAnalysisRequest.isActive = false;
        clearTimeout(this.pendingAnalysisRequest.timeoutId);
        try {
            this.pendingAnalysisRequest.reject(new Error('Analysis request superseded by a new one.'));
        } catch (e) { /* Old promise might be settled */ }
        this.sendCommand('stop');
    }

    return new Promise<AnalysisResult | null>((resolve, reject) => {
      const calculationTime = options.movetime || (options.depth || 10) * 1000;
      const timeoutDuration = 5000 + calculationTime;

      logger.debug(`[StockfishService gameplay] getAnalysis: FEN=${fen}, Options=${JSON.stringify(options)}, Timeout=${timeoutDuration}ms`);

      const currentRequestObject: PendingAnalysisRequest = {
        resolve,
        reject,
        timeoutId: 0,
        fen,
        options,
        collectedLines: new Map<number, EvaluatedLine>(),
        currentBestMove: null,
        isActive: true,
      };

      currentRequestObject.timeoutId = window.setTimeout(() => {
        if (this.pendingAnalysisRequest === currentRequestObject && currentRequestObject.isActive) {
            logger.warn(`[StockfishService gameplay] getAnalysis timeout for FEN: ${fen} after ${timeoutDuration}ms`);
            this.sendCommand('stop');
            currentRequestObject.isActive = false;
            try {
                reject(new Error('StockfishService (gameplay) getAnalysis timeout'));
            } catch(e) { /* Promise might be settled */ }
            if (this.pendingAnalysisRequest === currentRequestObject) {
                this.pendingAnalysisRequest = null;
            }
        }
      }, timeoutDuration);

      this.pendingAnalysisRequest = currentRequestObject;

      this.sendCommand('ucinewgame');
      this.sendCommand(`position fen ${fen}`);

      let goCommand = 'go';
      if (options.depth) goCommand += ` depth ${options.depth}`;
      if (options.movetime) goCommand += ` movetime ${options.movetime}`;
      if (!options.depth && !options.movetime) goCommand += ` depth 10`;
      
      this.sendCommand(goCommand);
    });
  }

  public async getBestMoveOnly(fen: string, options: { depth?: number; movetime?: number } = {}): Promise<string | null> {
    const analysisOptions: AnalysisOptions = { ...options };
    try {
        const result = await this.getAnalysis(fen, analysisOptions);
        return result ? result.bestMoveUci : null;
    } catch (error) {
        logger.warn(`[StockfishService gameplay getBestMoveOnly] Underlying getAnalysis failed: ${(error as Error).message}`);
        return null;
    }
  }

  public async terminate(): Promise<void> {
    if (this.engine) {
      logger.info('[StockfishService gameplay] Terminating engine...');
      if (this.engine.terminate) {
        this.engine.terminate();
      } else {
        try { this.engine.postMessage('quit'); } catch (e) { /* ignore */ }
      }
      this.engine = null;
    }
    this.isReady = false;
    this.commandQueue = [];
    if (this.rejectInitPromise) {
      try { this.rejectInitPromise(new Error('Engine terminated during initialization.')); } catch (e) { /* ignore */ }
    }
    this.initPromise = new Promise<void>((resolve, reject) => {
      this.resolveInitPromise = resolve;
      this.rejectInitPromise = reject;
    });

    if (this.pendingAnalysisRequest && this.pendingAnalysisRequest.isActive) {
          clearTimeout(this.pendingAnalysisRequest.timeoutId);
          try { this.pendingAnalysisRequest.reject(new Error('Engine terminated during analysis request')); } catch (e) { /* ignore */ }
          this.pendingAnalysisRequest = null;
    }
  }
}
