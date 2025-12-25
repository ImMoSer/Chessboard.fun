// src/services/OpeningCacheService.ts
import Dexie, { type Table } from 'dexie';

export interface OpeningStats {
    fen: string;
    history: string[]; // UCI moves
    data: any; // Raw response from Lichess
    timestamp: number;
}

export class OpeningDatabase extends Dexie {
    openings!: Table<OpeningStats>;

    constructor() {
        super('OpeningDatabase');
        this.version(1).stores({
            openings: 'fen, timestamp' // Use FEN as primary key
        });
    }
}

export const db = new OpeningDatabase();

class OpeningCacheService {
    private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

    async getCachedStats(fen: string): Promise<any | null> {
        try {
            const record = await db.openings.get(fen);
            if (record) {
                const now = Date.now();
                if (now - record.timestamp < this.CACHE_TTL) {
                    return record.data;
                } else {
                    // Cleanup expired record
                    await db.openings.delete(fen);
                }
            }
        } catch (error) {
            console.error('[OpeningCacheService] Error reading from cache:', error);
        }
        return null;
    }

    async cacheStats(fen: string, history: string[], data: any): Promise<void> {
        try {
            await db.openings.put({
                fen,
                history,
                data,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('[OpeningCacheService] Error writing to cache:', error);
        }
    }

    async clearCache(): Promise<void> {
        await db.openings.clear();
    }
}

export const openingCacheService = new OpeningCacheService();
