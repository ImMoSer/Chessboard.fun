// src/services/WikiBooksService.ts
import Dexie, { type Table } from 'dexie'
import type { WikiApiResponse, WikiPageExtract } from '../types/wikibooks.types'
import logger from '../utils/logger'

// --- Slug Builder ---
export class WikiUrlBuilder {
  private static readonly ROOT_SLUG = 'Chess_Opening_Theory'

  /**
   * Generates a Wikibooks slug from a history of moves.
   * @param moves Array of SAN moves (e.g., ["e4", "e5", "Nf3"])
   * @returns The formatted slug string
   */
  public static buildSlug(moves: string[]): string {
    if (moves.length === 0) {
      return this.ROOT_SLUG
    }

    const path = moves.reduce((acc, move, index) => {
      const moveNumber = Math.floor(index / 2) + 1
      const isWhite = index % 2 === 0
      const segment = isWhite ? `${moveNumber}._${move}` : `${moveNumber}...${move}`
      return `${acc}/${segment}`
    }, this.ROOT_SLUG)

    return path
  }

  public static getParentSlug(slug: string): string | null {
    if (slug === this.ROOT_SLUG) return null
    const parts = slug.split('/')
    if (parts.length <= 1) return null
    parts.pop()
    return parts.join('/')
  }

  public static getPublicUrl(slug: string): string {
    return `https://en.wikibooks.org/wiki/${slug}`
  }
}

// --- Database ---
export interface WikiCacheEntry extends WikiPageExtract {
  slug: string
}

export class WikiBooksDatabase extends Dexie {
  wikiCache!: Table<WikiCacheEntry>

  constructor() {
    super('WikiBooksDatabase')
    this.version(1).stores({
      wikiCache: 'slug, timestamp',
    })
  }
}

export const wikiDb = new WikiBooksDatabase()

// --- API Service ---
class WikiBooksApiService {
  private readonly BASE_URL = 'https://en.wikibooks.org/w/api.php'
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

  public async fetchTheory(slug: string): Promise<WikiPageExtract | null> {
    // 1. Check Cache
    try {
      const cached = await wikiDb.wikiCache.get(slug)
      if (
        cached &&
        Date.now() - cached.timestamp < this.CACHE_TTL &&
        cached.extract &&
        cached.extract.trim() !== ''
      ) {
        return cached
      }
    } catch (err) {
      logger.error('[WikiBooksApiService] Cache read error:', err)
    }

    // 2. Fetch from API
    try {
      const url = new URL(this.BASE_URL)
      const params = {
        action: 'query',
        format: 'json',
        prop: 'extracts',
        titles: slug,
        redirects: '1',
        origin: '*',
        formatversion: '2',
      }
      Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value))

      const response = await fetch(url.toString())
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const data: WikiApiResponse = await response.json()
      const pages = data.query.pages

      if (!pages || (Array.isArray(pages) && pages.length === 0)) return null

      const pageData = Array.isArray(pages) ? pages[0] : Object.values(pages)[0]
      if (!pageData) return null

      if ('missing' in pageData && pageData.missing) {
        return null
      }

      const result: WikiPageExtract = {
        pageid: pageData.pageid as number,
        ns: pageData.ns as number,
        title: pageData.title as string,
        extract: pageData.extract as string,
        timestamp: Date.now(),
      }

      // Treat empty content as null to trigger fallback/retry
      if (!result.extract || result.extract.trim() === '') {
        return null
      }

      // 3. Update Cache
      await wikiDb.wikiCache.put({ ...result, slug })

      return result
    } catch (err) {
      logger.error('[WikiBooksApiService] Fetch error:', err)
      throw err
    }
  }

  /**
   * Recursive fetch with parent fallback
   */
  public async fetchWithFallback(moves: string[]): Promise<WikiPageExtract | null> {
    const currentMoves = [...moves]
    while (true) {
      const slug = WikiUrlBuilder.buildSlug(currentMoves)
      try {
        const data = await this.fetchTheory(slug)
        if (data) return data
      } catch {
        // Fallback to parent
      }

      if (currentMoves.length === 0) break
      currentMoves.pop()
    }
    return null
  }
}

export const wikiBooksApiService = new WikiBooksApiService()
