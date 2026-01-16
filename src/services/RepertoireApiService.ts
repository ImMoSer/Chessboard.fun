// src/services/RepertoireApiService.ts
import logger from '../utils/logger';

export interface RepertoireParams {
    start_fen?: string;
    start_pgn?: string;
    color: 'white' | 'black';
    profile: 'amateur' | 'club' | 'master';
}

class RepertoireApiService {
    private readonly BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000/api';

    async generateSharpRepertoire(params: RepertoireParams): Promise<string | null> {
        try {
            logger.info(`[RepertoireApiService] Requesting sharp repertoire:`, params);
            const response = await fetch(`${this.BACKEND_URL}/opening/repertoire/sharp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                throw new Error(`Repertoire API Error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.pgn;
        } catch (error) {
            logger.error(`[RepertoireApiService] Error generating repertoire:`, error);
            return null;
        }
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.BACKEND_URL}/opening/health`);
            return await response.json();
        } catch (error) {
            return { status: 'error', error };
        }
    }
}

export const repertoireApiService = new RepertoireApiService();
