// src/types/openingTrainer.types.ts
import { type LichessMove, type LichessOpeningResponse } from '../services/OpeningApiService';

export interface SessionMove {
    fen: string;
    moveUci: string;
    san: string;
    stats: LichessMove;
    // New Metrics
    popularity: number; // Raw % of total games
    winRate: number;    // Win % for the player's color
    rating: number;     // Average rating of players
}

export interface OpeningTrainerState {
    currentStats: LichessOpeningResponse | null;
    sessionHistory: SessionMove[];
    // Removed totalScore in favor of computed averages
    isTheoryOver: boolean;
    isDeviation: boolean;
    variability: number; // Top-N moves for bot
    playerColor: 'white' | 'black';
    openingName: string;
    isLoading: boolean;
    error: string | null;
}
