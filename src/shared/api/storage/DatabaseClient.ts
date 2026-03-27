/**
 * DatabaseClient.ts
 *
 * Production-grade SQLite + OPFS client using the official sqlite3Worker1Promiser API.
 *
 * Architecture:
 * - Uses the official `sqlite3-worker1.mjs` from @sqlite.org/sqlite-wasm (no custom worker).
 * - The official worker handles OPFS VFS setup, WASM loading, and proxy worker internally.
 * - We communicate via the type-safe sqlite3Worker1Promiser.v2() Promise API.
 * - Two databases: `global` (theory cache, shared) and `user` (per lichess_id).
 */
import type { Worker1Promiser } from '@sqlite.org/sqlite-wasm'
import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm'

type DbId = string

/**
 * The ESM bundle of sqlite-wasm directly exports the 'v2' promiser function
 * as `sqlite3Worker1Promiser`, contrary to the TypeScript definition which
 * defines it as a factory object with a `.v2` property.
 */
type PromiserFactoryV2 = (config?: unknown) => Promise<Worker1Promiser>
const promiserFactoryV2 = sqlite3Worker1Promiser as unknown as PromiserFactoryV2

const DB_SCHEMA_VERSION = 3 // Incremented to trigger reset for lichessId update

class DatabaseClient {
  private promiser: Worker1Promiser | null = null
  private globalDbId: DbId | null = null
  private userDbId: DbId | null = null
  private initPromise: Promise<void> | null = null

  /**
   * Initialize the SQLite worker and open the global cache DB.
   * Must be called once at app startup (in GlobalAssetLoader).
   */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = this._doInit()
    return this.initPromise
  }

  private async _doInit(): Promise<void> {
    // 1. Check for schema reset
    const savedVersion = localStorage.getItem('app_db_schema_version')
    if (!savedVersion || parseInt(savedVersion, 10) < DB_SCHEMA_VERSION) {
      console.warn(`[DatabaseClient] Schema version mismatch (saved: ${savedVersion}, current: ${DB_SCHEMA_VERSION}). Resetting OPFS...`)
      try {
        const root = await navigator.storage.getDirectory()
        // We use a for-await-of loop to clear all entries in OPFS
        for await (const name of (root as unknown as { keys(): AsyncIterable<string> }).keys()) {
          await root.removeEntry(name, { recursive: true })
        }
        localStorage.setItem('app_db_schema_version', DB_SCHEMA_VERSION.toString())
        console.info('[DatabaseClient] OPFS reset complete.')
      } catch (err) {
        console.error('[DatabaseClient] Failed to reset OPFS storage:', err)
      }
    }

    // 2. Explicitly set the worker URL to /sqlite3-worker1.mjs which is
    // where we copy it via vite-plugin-static-copy.
    const promiser = await promiserFactoryV2({
      worker: () => new Worker('/sqlite3-worker1.mjs', { type: 'module' }),
    })
    this.promiser = promiser

    // Open the global cache DB in OPFS
    const response = await promiser('open', {
      filename: 'file:global_openings_cache?vfs=opfs',
    })
    this.globalDbId = response.result.dbId

    // Initialize global schema
    await this._initGlobalSchema()
  }

  private async _initGlobalSchema(): Promise<void> {
    if (!this.globalDbId) return

    await this._exec(this.globalDbId, `
      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT
      )
    `)
    await this._exec(this.globalDbId, "INSERT OR IGNORE INTO meta (key, value) VALUES ('version', '1')")

    await this._exec(this.globalDbId, `
      CREATE TABLE IF NOT EXISTS theory_stats (
        fen_key TEXT,
        source  TEXT,
        data    TEXT,
        expires INTEGER,
        PRIMARY KEY (fen_key, source)
      )
    `)
    await this._exec(this.globalDbId, `
      CREATE TABLE IF NOT EXISTS wiki_content (
        slug      TEXT PRIMARY KEY,
        content   TEXT,
        timestamp INTEGER
      )
    `)
  }

  /**
   * Open (or switch to) the per-user database.
   * Call this after the user is identified (after auth check).
   */
  async openUserDb(lichessId: string): Promise<void> {
    if (!this.promiser) throw new Error('[DatabaseClient] Not initialized. Call init() first.')

    // Close previous user DB if open
    if (this.userDbId) {
      await this.promiser({ type: 'close', dbId: this.userDbId })
      this.userDbId = null
    }

    const safeId = lichessId.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
    const response = await this.promiser('open', {
      filename: `file:user_${safeId}?vfs=opfs`,
    })
    this.userDbId = response.result.dbId

    // Initialize user schema
    await this._initUserSchema()
  }

  private async _initUserSchema(): Promise<void> {
    if (!this.userDbId) return

    await this._exec(this.userDbId, `
      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT
      )
    `)
    await this._exec(this.userDbId, "INSERT OR IGNORE INTO meta (key, value) VALUES ('version', '1')")

    await this._exec(this.userDbId, `
      CREATE TABLE IF NOT EXISTS studies (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL,
        chapterIds  TEXT NOT NULL DEFAULT '[]',
        lichessId   TEXT,
        type        TEXT,
        order_index INTEGER DEFAULT 0
      )
    `)
    await this._exec(this.userDbId, `
      CREATE TABLE IF NOT EXISTS chapters (
        id        TEXT PRIMARY KEY,
        studyId   TEXT,
        name      TEXT NOT NULL,
        root      TEXT NOT NULL,
        tags      TEXT NOT NULL DEFAULT '{}',
        savedPath TEXT NOT NULL DEFAULT '',
        config    TEXT NOT NULL DEFAULT '{}'
      )
    `)
    await this._exec(this.userDbId, `
      CREATE TABLE IF NOT EXISTS diamonds (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        hash         TEXT NOT NULL,
        fen          TEXT NOT NULL,
        pgn          TEXT NOT NULL,
        collected_at INTEGER NOT NULL
      )
    `)
    await this._exec(this.userDbId, `
      CREATE TABLE IF NOT EXISTS brilliants (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        hash         TEXT NOT NULL,
        fen          TEXT NOT NULL,
        pgn          TEXT NOT NULL,
        collected_at INTEGER NOT NULL
      )
    `)
    await this._exec(this.userDbId, `
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT
      )
    `)
  }

  /**
   * Run a SQL statement (no result rows).
   */
  async exec(
    target: 'global' | 'user',
    sql: string,
    params: (string | number | null)[] = [],
  ): Promise<void> {
    await this.init() // Ensure base initialization is done
    const dbId = await this._getDbId(target)
    await this._exec(dbId, sql, params)
  }

  /**
   * Run a SELECT and return typed rows.
   */
  async query<T = Record<string, unknown>>(
    target: 'global' | 'user',
    sql: string,
    params: (string | number | null)[] = [],
  ): Promise<T[]> {
    await this.init() // Ensure base initialization is done
    const dbId = await this._getDbId(target)

    if (!this.promiser) throw new Error('[DatabaseClient] Not initialized.')

    try {
      const response = await this.promiser({
        type: 'exec',
        dbId,
        args: {
          sql,
          bind: params,
          rowMode: 'object',
          returnValue: 'resultRows',
        },
      })

      return (response.result.resultRows ?? []) as T[]
    } catch (err) {
      console.error(`[DatabaseClient] SQL Query Error: ${sql}`, err)
      throw err
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async _getDbId(target: 'global' | 'user'): Promise<string> {
    // If user DB is requested but not open, we might need to wait for GlobalAssetLoader
    // to call openUserDb. We poll briefly or we can implement a more elegant signal.
    if (target === 'global') {
      if (!this.globalDbId) {
        // Wait a bit if it's currently initializing
        await this.init()
        if (!this.globalDbId) throw new Error('[DatabaseClient] Global DB not open.')
      }
      return this.globalDbId
    }

    if (!this.userDbId) {
      // If userDbId is missing, it's either because openUserDb wasn't called
      // or we are in a race.
      let attempts = 0
      while (!this.userDbId && attempts < 10) {
        await new Promise(r => setTimeout(r, 100))
        attempts++
      }
      if (!this.userDbId) throw new Error('[DatabaseClient] User DB not open. Ensure openUserDb() was called.')
    }
    return this.userDbId
  }

  private async _exec(
    dbId: string | null,
    sql: string,
    params: (string | number | null)[] = [],
  ): Promise<void> {
    if (!this.promiser) throw new Error('[DatabaseClient] Not initialized.')
    try {
      await this.promiser({
        type: 'exec',
        dbId: dbId ?? undefined,
        args: { sql, bind: params },
      })
    } catch (err) {
      console.error(`[DatabaseClient] SQL Execution Error: ${sql}`, err)
      throw err
    }
  }
}

// Singleton
export const databaseClient = new DatabaseClient()
