import { databaseClient } from '../DatabaseClient'

export interface TheoryStat {
  fen_key: string
  source: string
  data: unknown
  expires: number
}

export interface WikiContent {
  slug: string
  content: string
  timestamp: number
}

interface RawTheoryStatRow {
  fen_key: string
  source: string
  data: string
  expires: number
}

export class GlobalCacheRepository {
  async getTheoryStat(fen: string, source: string): Promise<TheoryStat | null> {
    const rows = await databaseClient.query<RawTheoryStatRow>('global', `
      SELECT * FROM theory_stats WHERE fen_key = ? AND source = ?
    `, [fen, source])

    if (rows.length === 0) return null

    const row = rows[0]!
    if (Date.now() > row.expires) {
      await this.deleteTheoryStat(fen, source)
      return null
    }

    return {
      fen_key: row.fen_key,
      source: row.source,
      expires: row.expires,
      data: JSON.parse(row.data),
    }
  }

  async saveTheoryStat(stat: TheoryStat): Promise<void> {
    await databaseClient.exec('global', `
      INSERT INTO theory_stats (fen_key, source, data, expires)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(fen_key, source) DO UPDATE SET
        data    = excluded.data,
        expires = excluded.expires
    `, [stat.fen_key, stat.source, JSON.stringify(stat.data), stat.expires])
  }

  async deleteTheoryStat(fen: string, source: string): Promise<void> {
    await databaseClient.exec('global',
      'DELETE FROM theory_stats WHERE fen_key = ? AND source = ?',
      [fen, source],
    )
  }

  async cleanupExpiredStats(): Promise<number> {
    const now = Date.now()
    // We can't easily get the number of deleted rows from this abstraction without changing it,
    // but we can at least run the delete.
    await databaseClient.exec('global', 'DELETE FROM theory_stats WHERE expires < ?', [now])
    return 0 // Placeholder or we could query before/after if needed
  }

  async getWikiContent(slug: string): Promise<WikiContent | null> {
    const rows = await databaseClient.query<WikiContent>('global',
      'SELECT * FROM wiki_content WHERE slug = ?',
      [slug],
    )
    return rows.length > 0 ? rows[0]! : null
  }

  async saveWikiContent(content: WikiContent): Promise<void> {
    await databaseClient.exec('global', `
      INSERT INTO wiki_content (slug, content, timestamp)
      VALUES (?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        content   = excluded.content,
        timestamp = excluded.timestamp
    `, [content.slug, content.content, content.timestamp])
  }
}

export const globalCacheRepository = new GlobalCacheRepository()
