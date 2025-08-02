// src/core/analysis.service.ts
import logger from '../utils/logger';
import type { StockfishService as GameplayStockfishService } from './stockfish.service'; 
import { 
    InfiniteAnalysisStockfishService, 
    type EvaluatedLine as ContinuousEvaluatedLine, 
    type AnalysisUpdateCallback                    
} from './infiniteAnalysisStockfish.service'; 
import type { Color as ChessopsColor } from 'chessops/types';

export interface AnalysisOptions {
  depth?: number;
  movetime?: number;
  lines?: number;
}

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

export interface EvaluatedLineWithSan extends ContinuousEvaluatedLine { 
  pvSan: string[];                                                    
  startingFen: string;
  initialFullMoveNumber: number;
  initialTurn: ChessopsColor;
}

export interface AnalysisStateForUI {
  isActive: boolean;
  isLoading: boolean;
  lines: EvaluatedLineWithSan[] | null;
  currentFenAnalyzed: string | null;
}


export class AnalysisService {
  private gameplayStockfishService: GameplayStockfishService;
  private infiniteAnalysisStockfishService: InfiniteAnalysisStockfishService;

  constructor(
    gameplayStockfishService: GameplayStockfishService,
    infiniteAnalysisStockfishService: InfiniteAnalysisStockfishService,
  ) {
    this.gameplayStockfishService = gameplayStockfishService;
    this.infiniteAnalysisStockfishService = infiniteAnalysisStockfishService;
    logger.info('[AnalysisService] Initialized with both Gameplay and Infinite Analysis Stockfish services.');
  }

  public async getAnalysis(fen: string, options: AnalysisOptions): Promise<EvaluatedLine[] | null> {
    logger.debug(`[AnalysisService] Requesting single analysis (gameplay) for FEN: ${fen} with options:`, options);
    try {
      const analysisResult = await this.gameplayStockfishService.getAnalysis(fen, options);
      if (analysisResult && analysisResult.evaluatedLines) {
        return analysisResult.evaluatedLines.map(line => ({
          id: line.id,
          depth: line.depth,
          score: line.score as ScoreInfo, 
          pvUci: line.pvUci,
        }));
      }
      logger.warn(`[AnalysisService] GameplayStockfishService returned null or no evaluatedLines for FEN: ${fen}`);
      return null;
    } catch (error: any) {
      logger.error(`[AnalysisService] Error calling GameplayStockfishService.getAnalysis for FEN ${fen}:`, error.message);
      return null;
    }
  }

  public async startContinuousAnalysis(fen: string, linesToAnalyze: number, callback: AnalysisUpdateCallback): Promise<void> {
    logger.info(`[AnalysisService] Attempting to start continuous analysis. FEN: ${fen}, Lines: ${linesToAnalyze}`);
    try {
      logger.debug(`[AnalysisService] Ensuring InfiniteAnalysisStockfishService is ready...`);
      await this.infiniteAnalysisStockfishService.ensureReady();
      logger.debug(`[AnalysisService] InfiniteAnalysisStockfishService is ready. Attempting to set MultiPV option to ${linesToAnalyze}...`);
      
      await this.infiniteAnalysisStockfishService.setOption('MultiPV', linesToAnalyze); 
      logger.debug(`[AnalysisService] MultiPV option set (or command sent to be set). Attempting to start analysis in InfiniteAnalysisStockfishService...`);

      await this.infiniteAnalysisStockfishService.startAnalysis(fen, callback); 
      logger.debug(`[AnalysisService] Call to infiniteAnalysisStockfishService.startAnalysis has been made.`);

    } catch (error: any) {
        logger.error(`[AnalysisService] Error in startContinuousAnalysis for FEN ${fen}:`, error.message, error);
        callback([], null); 
    }
  }

  public async stopContinuousAnalysis(): Promise<void> {
    logger.info('[AnalysisService] Stopping continuous analysis.');
    await this.infiniteAnalysisStockfishService.stopAnalysis();
  }
  
  public async setInfiniteAnalysisOption(name: string, value: string | number): Promise<void> {
    logger.debug(`[AnalysisService] Attempting to set infinite analysis option: ${name} = ${value}`);
    await this.infiniteAnalysisStockfishService.ensureReady();
    await this.infiniteAnalysisStockfishService.setOption(name, value);
    logger.info(`[AnalysisService] UCI option set for infinite analysis via setInfiniteAnalysisOption: ${name} = ${value}.`);
  }

  /**
   * NEW: Added to expose the underlying service's method.
   */
  public getMaxThreads(): number {
    return this.infiniteAnalysisStockfishService.getMaxThreads();
  }

  public destroy(): void {
    logger.info('[AnalysisService] Destroying AnalysisService instance.');
  }
}
