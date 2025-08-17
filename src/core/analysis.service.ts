// src/core/analysis.service.ts
import logger from '../utils/logger';
import { 
    StockfishManager, 
    type AnalysisUpdateCallback, 
    type EvaluatedLine,
    type AnalysisOptions
} from './stockfish-manager.service';
import type { Color as ChessopsColor } from 'chessops/types';

export interface EvaluatedLineWithSan extends EvaluatedLine { 
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
  constructor() {
    logger.info('[AnalysisService] Initialized. Now using StockfishManager.');
  }

  public async getAnalysis(fen: string, options: AnalysisOptions): Promise<EvaluatedLine[] | null> {
    logger.debug(`[AnalysisService] Requesting single analysis for FEN: ${fen} with options:`, options);
    try {
      const analysisResult = await StockfishManager.getAnalysis(fen, options);
      return analysisResult?.evaluatedLines || null;
    } catch (error: any) {
      logger.error(`[AnalysisService] Error calling StockfishManager.getAnalysis for FEN ${fen}:`, error.message);
      return null;
    }
  }

  public async startContinuousAnalysis(fen: string, linesToAnalyze: number, callback: AnalysisUpdateCallback): Promise<void> {
    logger.info(`[AnalysisService] Starting continuous analysis via StockfishManager. FEN: ${fen}, Lines: ${linesToAnalyze}`);
    try {
      await StockfishManager.setOption('MultiPV', linesToAnalyze); 
      await StockfishManager.startAnalysis(fen, callback); 
    } catch (error: any) {
        logger.error(`[AnalysisService] Error in startContinuousAnalysis for FEN ${fen}:`, error.message, error);
        callback([], null); 
    }
  }

  public async stopContinuousAnalysis(): Promise<void> {
    logger.info('[AnalysisService] Stopping continuous analysis via StockfishManager.');
    await StockfishManager.stopAnalysis();
  }
  
  public async setInfiniteAnalysisOption(name: string, value: string | number): Promise<void> {
    logger.info(`[AnalysisService] Setting analysis option via StockfishManager: ${name} = ${value}.`);
    await StockfishManager.setOption(name, value);
  }

  public getMaxThreads(): number {
    return StockfishManager.getMaxThreads();
  }

  public destroy(): void {
    logger.info('[AnalysisService] Destroying AnalysisService instance.');
  }
}
