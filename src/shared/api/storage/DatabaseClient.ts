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

const DB_SCHEMA_VERSION = 12 // PGN-centric storage with separate metadata table

class DatabaseClient {
  private promiser: Worker1Promiser | null = null
  private globalDbId: DbId | null = null
  private userDbId: DbId | null = null
  private initPromise: Promise<void> | null = null
  private _transactionLock: Promise<void> = Promise.resolve()

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

    // 2. Initialize the worker using a fixed path. 
    // This path is served from node_modules in dev and copied to dist in production.
    const promiser = await promiserFactoryV2({
      worker: () => new Worker('/sqlite3-worker1.mjs', { type: 'module' }),
    })
    this.promiser = promiser

    // Open the global cache DB in OPFS.
    // CRITICAL: Specifying vfs: 'opfs' explicitly prevents the 4GB bloom (SAH-pool).
    const response = await promiser('open', {
      filename: 'global_openings_cache',
      vfs: 'opfs',
    })
    this.globalDbId = response.result.dbId

    // Set auto_vacuum to prevent future bloat
    await this._exec(this.globalDbId, 'PRAGMA auto_vacuum = INCREMENTAL;')

    // Initialize global schema
    await this._initGlobalSchema()

    // Active Cleanup: Remove expired entries from theory_stats
    try {
      await this._exec(this.globalDbId, 'DELETE FROM theory_stats WHERE expires < ?', [Date.now()])
      await this._exec(this.globalDbId, 'PRAGMA incremental_vacuum(100);') // Reclaim some space if needed
    } catch (err) {
      console.warn('[DatabaseClient] Global DB cleanup failed:', err)
    }
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
    await this.init() // Ensure base initialization is done before attempting to open user db

    if (!this.promiser) throw new Error('[DatabaseClient] Not initialized. Call init() first.')

    // Close previous user DB if open
    if (this.userDbId) {
      await this.promiser({ type: 'close', dbId: this.userDbId })
      this.userDbId = null
    }

    const safeId = lichessId.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
    const response = await this.promiser('open', {
      filename: `user_${safeId}`,
      vfs: 'opfs',
    })
    this.userDbId = response.result.dbId

    // Set auto_vacuum to prevent future bloat
    await this._exec(this.userDbId, 'PRAGMA auto_vacuum = INCREMENTAL;')

    // Initialize user schema
    await this._initUserSchema()

    // Active Cleanup: Reclaim space from user DB
    try {
      await this._exec(this.userDbId, 'PRAGMA incremental_vacuum(100);')
    } catch (err) {
      console.warn('[DatabaseClient] User DB cleanup failed:', err)
    }
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
        tags      TEXT NOT NULL DEFAULT '{}',
        savedPath TEXT NOT NULL DEFAULT '',
        config    TEXT NOT NULL DEFAULT '{}',
        pgn_text  TEXT NOT NULL DEFAULT ''
      )
    `)
    await this._exec(this.userDbId, `
      CREATE TABLE IF NOT EXISTS node_metadata (
        chapter_id TEXT,
        node_path  TEXT,
        metadata   TEXT,
        PRIMARY KEY (chapter_id, node_path),
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
      )
    `)
    await this._exec(this.userDbId, `
      CREATE INDEX IF NOT EXISTS idx_node_metadata_chapter_id ON node_metadata(chapter_id)
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
  async query<T>(
    target: 'global' | 'user',
    sql: string,
    params: (string | number | null)[] = [],
  ): Promise<T[]> {
    await this.init()
    const dbId = await this._getDbId(target)
    try {
      const response = await this.promiser!({
        type: 'exec',
        dbId,
        args: { 
          sql, 
          bind: params,
          columnNames: [], // Request column names
          returnValue: 'resultRows' // Request data rows
        },
      })
      
      const result: T[] = []
      const res = response.result as any
      
      if (res.columnNames && res.resultRows) {
        const cols = res.columnNames as string[]
        for (const rowVals of res.resultRows as any[][]) {
          const obj: any = {}
          cols.forEach((name, i) => {
            obj[name] = rowVals[i]
          })
          result.push(obj as T)
        }
      }
      return result
    } catch (err) {
      console.error(`[DatabaseClient] Query Error: ${sql}`, err)
      return []
    }
  }

  /**
   * Run multiple statements in a serial transaction.
   * Note: This is a poor-man's transaction using a promise lock,
   * as the Worker1 API doesn't support interactive transactions over the bridge.
   */
  async transaction(target: 'global' | 'user', cb: () => Promise<void>): Promise<void> {
    await this.init()
    const dbId = await this._getDbId(target)

    // Wait for previous transaction to finish
    await this._transactionLock
    
    // Create a new lock
    let resolveLock: () => void
    this._transactionLock = new Promise((resolve) => {
      resolveLock = resolve
    })

    try {
      await this._exec(dbId, 'BEGIN TRANSACTION')
      await cb()
      await this._exec(dbId, 'COMMIT')
    } catch (err) {
      await this._exec(dbId, 'ROLLBACK')
      console.error('[DatabaseClient] Transaction failed and rolled back:', err)
      throw err
    } finally {
      resolveLock!()
    }
  }

  private async _getDbId(target: 'global' | 'user'): Promise<DbId> {
    const id = target === 'global' ? this.globalDbId : this.userDbId
    if (!id) throw new Error(`[DatabaseClient] Database "${target}" not open.`)
    return id
  }

  private async _exec(dbId: DbId | null, sql: string, params: (string | number | null)[] = []): Promise<void> {
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
