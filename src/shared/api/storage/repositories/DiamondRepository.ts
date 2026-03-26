import { databaseClient } from '../DatabaseClient'

export interface Diamond {
  id?: number
  hash: string
  fen: string
  pgn: string
  collected_at: number
}

export interface Brilliant {
  id?: number
  hash: string
  fen: string
  pgn: string
  collected_at: number
}

interface CountRow {
  count: number
}

export class DiamondRepository {
  async addDiamond(diamond: Diamond): Promise<void> {
    await databaseClient.exec('user', `
      INSERT INTO diamonds (hash, fen, pgn, collected_at)
      VALUES (?, ?, ?, ?)
    `, [diamond.hash, diamond.fen, diamond.pgn, diamond.collected_at])
  }

  async getDiamondCountForHashToday(hash: string): Promise<number> {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const rows = await databaseClient.query<CountRow>('user', `
      SELECT COUNT(*) as count FROM diamonds
      WHERE hash = ? AND collected_at > ?
    `, [hash, startOfDay.getTime()])

    return rows[0]?.count ?? 0
  }

  async getAllDiamonds(): Promise<Diamond[]> {
    return databaseClient.query<Diamond>('user',
      'SELECT * FROM diamonds ORDER BY collected_at DESC',
    )
  }

  async getDiamondCount(): Promise<number> {
    const rows = await databaseClient.query<CountRow>('user',
      'SELECT COUNT(*) as count FROM diamonds',
    )
    return rows[0]?.count ?? 0
  }

  async getBrilliantCount(): Promise<number> {
    const rows = await databaseClient.query<CountRow>('user',
      'SELECT COUNT(*) as count FROM brilliants',
    )
    return rows[0]?.count ?? 0
  }

  async deleteDiamond(id: number): Promise<void> {
    await databaseClient.exec('user', 'DELETE FROM diamonds WHERE id = ?', [id])
  }

  async addBrilliant(brilliant: Brilliant): Promise<void> {
    await databaseClient.exec('user', `
      INSERT INTO brilliants (hash, fen, pgn, collected_at)
      VALUES (?, ?, ?, ?)
    `, [brilliant.hash, brilliant.fen, brilliant.pgn, brilliant.collected_at])
  }

  async removeLastBrilliant(): Promise<void> {
    await databaseClient.exec('user', `
      DELETE FROM brilliants
      WHERE id = (SELECT id FROM brilliants ORDER BY collected_at DESC LIMIT 1)
    `)
  }
}

export const diamondRepository = new DiamondRepository()
