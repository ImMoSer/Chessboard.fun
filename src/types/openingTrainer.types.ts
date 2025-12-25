// src/types/openingTrainer.types.ts
import { type LichessMove, type LichessOpeningResponse } from '../services/OpeningApiService';

export interface SessionMove {
    fen: string;
    moveUci: string;
    san: string;
    stats: LichessMove;
    score: number;
}

export interface OpeningTrainerState {
    currentStats: LichessOpeningResponse | null;
    sessionHistory: SessionMove[];
    totalScore: number;
    isTheoryOver: boolean;
    isDeviation: boolean;
    variability: number; // Top-N moves for bot
    playerColor: 'white' | 'black';
    openingName: string;
    isLoading: boolean;
    error: string | null;
}
