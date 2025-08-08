// src/core/infiniteAnalysisStockfish.service.ts
import logger from '../utils/logger';
import { loadEngine, type EngineController } from './engine.loader';

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

export type AnalysisUpdateCallback = (lines: EvaluatedLine[], bestMoveUci?: string | null) => void;

const THREADS_STORAGE_KEY = 'stockfish_analysis_threads';
const MAX_ANALYSIS_DEPTH = 30;

export class InfiniteAnalysisStockfishService {
  private engine: EngineController | null = null;
  private isReady: boolean = false;
  private isAnalyzing: boolean = false;
  private commandQueue: string[] = [];
  private initPromise: Promise<void>;
  private resolveInitPromise!: () => void;
  private rejectInitPromise!: (reason?: any) => void;

  private onUpdateCallback: AnalysisUpdateCallback | null = null;
  private collectedLines: Map<number, EvaluatedLine> = new Map();
  private lastBestMove: string | null = null;
  private currentAnalyzingFenInternal: string | null = null;
  private stopPromise: Promise<void> | null = null;
  private resolveStopPromise: (() => void) | null = null;
  
  private lastFenAnalyzed: string | null = null;

  private readonly UCI_OPTIONS_FOR_ANALYSIS = [
    'setoption name UCI_AnalyseMode value true',
    'setoption name Analysis Contempt value Off',
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
      logger.info(`[InfiniteAnalysisStockfishService] Loading engine via universal loader...`);
      this.engine = await loadEngine();
      
      this.engine.addMessageListener((message: string) => this.handleEngineMessage(message));
      this.sendCommand('uci');
      
      setTimeout(() => {
        if (!this.isReady) {
            const errorMsg = 'UCI handshake timeout for InfiniteAnalysisStockfishService';
            logger.error(`[InfiniteAnalysisStockfishService] ${errorMsg}`);
            if (this.rejectInitPromise) {
                try { this.rejectInitPromise(new Error(errorMsg)); } catch(e) {}
            }
        }
      }, 15000);
    } catch (error: any) {
      logger.error('[InfiniteAnalysisStockfishService] Failed to initialize engine (loader error):', error.message, error);
      this.isReady = false;
      if (this.rejectInitPromise) {
          try { this.rejectInitPromise(error); } catch(e) {}
      }
    }
  }

  private sendCommand(command: string): void {
    if (this.engine) {
      if (command !== 'uci' && command !== 'isready' && !this.isReady) {
        this.commandQueue.push(command);
        return;
      }
      logger.debug(`[InfiniteAnalysisStockfishService] Sending to Stockfish: ${command}`);
      this.engine.postMessage(command);
    }
  }

  private processCommandQueue(): void {
    while(this.commandQueue.length > 0) {
        const command = this.commandQueue.shift();
        if (command) {
            if (this.isReady) {
                 this.sendCommand(command);
            } else {
                this.commandQueue.unshift(command);
                break;
            }
        }
    }
  }

  private handleEngineMessage(message: string): void {
    const parts = message.split(' ');

    if (message === 'uciok') {
      logger.info('[InfiniteAnalysisStockfishService] UCI OK received.');
      this.UCI_OPTIONS_FOR_ANALYSIS.forEach(optionCmd => this.sendCommand(optionCmd));
      this._getAndApplyThreadSetting();
      this.sendCommand('isready');
    } else if (message === 'readyok') {
      this.isReady = true;
      logger.info('[InfiniteAnalysisStockfishService] Engine is ready (readyok received).');
      if (this.resolveInitPromise) {
        try { this.resolveInitPromise(); } catch(e) {}
      }
      this.processCommandQueue();
    } else if (parts[0] === 'info' && this.isAnalyzing && this.onUpdateCallback) {
      const depth = this.parseInfoLine(message);
      const linesArray = Array.from(this.collectedLines.values()).sort((a, b) => a.id - b.id);
      this.onUpdateCallback(linesArray, this.lastBestMove);
      
      if (depth && depth >= MAX_ANALYSIS_DEPTH) {
        this.stopAnalysis().catch(e => logger.error("Error during auto-stop at max depth", e));
      }

    } else if (parts[0] === 'bestmove') {
      this.lastBestMove = (parts[1] && parts[1] !== '(none)') ? parts[1] : null;
      logger.info(`[InfiniteAnalysisStockfishService] Received bestmove: ${this.lastBestMove}.`);
      if (this.resolveStopPromise) {
          this.resolveStopPromise();
          this.stopPromise = null;
          this.resolveStopPromise = null;
      }
      if (this.isAnalyzing && this.onUpdateCallback) {
        const linesArray = Array.from(this.collectedLines.values()).sort((a, b) => a.id - b.id);
        this.onUpdateCallback(linesArray, this.lastBestMove);
      }
    }
  }

  private parseInfoLine(line: string): number | null {
    if (!this.currentAnalyzingFenInternal) return null;

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
        const existingLine = this.collectedLines.get(currentLineId);
        if (!existingLine || depth >= existingLine.depth) {
             this.collectedLines.set(currentLineId, { id: currentLineId, depth, score, pvUci });
        }
        return depth;
      }
    } catch (error) {
      logger.warn('[InfiniteAnalysisStockfishService] Error parsing info line:', line, error);
    }
    return null;
  }

  public async ensureReady(): Promise<void> {
    if (this.isReady) return;
    if (!this.engine) await this.initEngine();
    return this.initPromise;
  }

  public async setOption(name: string, value: string | number): Promise<void> {
    await this.ensureReady();
    if (!this.isReady) {
        logger.error(`[InfiniteAnalysisStockfishService] Cannot set option "${name}", engine not ready.`);
        return;
    }
    this.sendCommand(`setoption name ${name} value ${value}`);
  }

  public async startAnalysis(fen: string, callback: AnalysisUpdateCallback): Promise<void> {
    await this.ensureReady();
    if (!this.engine) {
        return Promise.reject(new Error('Engine not available for startAnalysis.'));
    }
    if (this.isAnalyzing) {
      await this.stopAnalysis();
    }

    this.onUpdateCallback = callback;
    this.collectedLines.clear();
    this.lastBestMove = null;
    this.currentAnalyzingFenInternal = fen;
    this.isAnalyzing = true;

    logger.info(`[InfiniteAnalysisStockfishService] Starting analysis for FEN: ${fen}`);

    if (this.lastFenAnalyzed !== fen) {
        logger.info('[InfiniteAnalysisStockfishService] FEN has changed. Sending ucinewgame.');
        this.sendCommand('ucinewgame');
        this.lastFenAnalyzed = fen;
    } else {
        logger.info('[InfiniteAnalysisStockfishService] FEN is the same. Skipping ucinewgame for faster restart.');
    }

    this.sendCommand(`position fen ${fen}`);
    this.sendCommand('go infinite');
  }

  public async stopAnalysis(): Promise<void> {
    if (!this.isReady) {
        this.isAnalyzing = false;
        this.currentAnalyzingFenInternal = null;
        if (this.resolveStopPromise) {
            this.resolveStopPromise();
            this.stopPromise = null;
            this.resolveStopPromise = null;
        }
        return;
    }
    if (!this.isAnalyzing) {
        if (this.resolveStopPromise) {
            this.resolveStopPromise();
            this.stopPromise = null;
            this.resolveStopPromise = null;
        }
        return;
    }
    
    this.isAnalyzing = false;
    this.currentAnalyzingFenInternal = null;

    if (this.stopPromise) return this.stopPromise;

    this.stopPromise = new Promise<void>((resolve) => {
        this.resolveStopPromise = resolve;
        this.sendCommand('stop');
        const stopTimeoutId = setTimeout(() => {
            if (this.resolveStopPromise) {
                logger.warn('[InfiniteAnalysisStockfishService] Timeout waiting for bestmove after stop command.');
                this.resolveStopPromise();
                this.stopPromise = null;
                this.resolveStopPromise = null;
            }
        }, 2000);
        if (this.stopPromise) {
            this.stopPromise.finally(() => clearTimeout(stopTimeoutId));
        }
    });
    return this.stopPromise;
  }

  public async terminate(): Promise<void> {
    if (this.engine) {
      logger.info('[InfiniteAnalysisStockfishService] Terminating engine...');
      if (this.engine.terminate) {
        this.engine.terminate();
      } else {
        try { this.engine.postMessage('quit'); } catch (e) {}
      }
      this.engine = null;
    }
    this.isReady = false;
    this.isAnalyzing = false;
    this.commandQueue = [];
    this.onUpdateCallback = null;
    this.collectedLines.clear();
    this.lastBestMove = null;
    this.currentAnalyzingFenInternal = null;
    this.lastFenAnalyzed = null;
    if (this.rejectInitPromise) {
      try { this.rejectInitPromise(new Error('Engine terminated.')); } catch (e) {}
    }
    if (this.resolveStopPromise) {
        this.resolveStopPromise();
        this.stopPromise = null;
        this.resolveStopPromise = null;
    }
    this.initPromise = new Promise<void>((resolve, reject) => {
      this.resolveInitPromise = resolve;
      this.rejectInitPromise = reject;
    });
  }
  
  private _getAndApplyThreadSetting(): void {
    // Устанавливаем количество потоков, только если среда поддерживает многопоточность
    if (!window.crossOriginIsolated) {
        logger.info('[InfiniteAnalysisStockfishService] Environment is not cross-origin isolated. Skipping thread configuration.');
        return;
    }

    let threadCount = 2;
    try {
      const savedThreads = localStorage.getItem(THREADS_STORAGE_KEY);
      if (savedThreads) {
        threadCount = parseInt(savedThreads, 10);
      } else {
        const coreCount = navigator.hardwareConcurrency || 4;
        threadCount = coreCount > 2 ? 2 : 1;
      }
      const maxThreads = navigator.hardwareConcurrency || 16;
      threadCount = Math.max(1, Math.min(threadCount, maxThreads));
    } catch (e) {
      threadCount = 2;
    }
    this.setOption('Threads', threadCount);
    logger.info(`[InfiniteAnalysisStockfishService] Analysis threads set to: ${threadCount}`);
  }

  public async setThreads(numThreads: number): Promise<void> {
    const maxThreads = this.getMaxThreads();
    const threadsToSet = Math.max(1, Math.min(numThreads, maxThreads));
    localStorage.setItem(THREADS_STORAGE_KEY, String(threadsToSet));
    if (this.isReady && window.crossOriginIsolated) {
      await this.setOption('Threads', threadsToSet);
    }
  }

  public getMaxThreads(): number {
    return navigator.hardwareConcurrency || 16;
  }
}
