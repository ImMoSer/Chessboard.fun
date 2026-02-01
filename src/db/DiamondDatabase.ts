import Dexie, { type EntityTable } from 'dexie';

export interface DiamondRecord {
  id: number;
  diamondHash: string; // The Zobrist Hash or FEN of the position *before* the blunder
  fen: string;         // The full FEN string
  pgn: string;         // The PGN/move list leading to this diamond
  collectedAt: number; // Timestamp (Date.now())
}

export interface BrilliantRecord {
  id: number;
  hash: string;
  fen: string;
  pgn: string;
  collectedAt: number;
}

export class DiamondDatabase extends Dexie {
  diamonds!: EntityTable<DiamondRecord, 'id'>;
  brilliants!: EntityTable<BrilliantRecord, 'id'>;

  constructor() {
    super('DiamondDB');
    this.version(1).stores({
      diamonds: '++id, diamondHash, collectedAt'
    });
    this.version(2).stores({
      diamonds: '++id, diamondHash, collectedAt',
      brilliants: '++id, hash, collectedAt'
    });
  }
}

export const db = new DiamondDatabase();

export async function checkDiamondLimit(hash: string): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await db.diamonds
    .where('diamondHash')
    .equals(hash)
    .and((r) => r.collectedAt > startOfDay.getTime())
    .count();

  return count < 2;
}

export async function recordDiamond(hash: string, fen: string, pgn: string): Promise<void> {
  await db.diamonds.add({
    diamondHash: hash,
    fen,
    pgn,
    collectedAt: Date.now(),
  } as DiamondRecord);
}

export async function recordBrilliant(hash: string, fen: string, pgn: string): Promise<void> {
  await db.brilliants.add({
    hash,
    fen,
    pgn,
    collectedAt: Date.now(),
  } as BrilliantRecord);
}
