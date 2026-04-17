import { pgnParserService } from '@/shared/lib/pgn/PgnParserService'
import { pgnService } from '@/shared/lib/pgn/PgnService'
import { databaseClient } from '../DatabaseClient'
import { toRaw } from 'vue'
import type { PgnNode } from '@/shared/lib/pgn/PgnService'

export interface Study {
  id: string
  title: string
  chapterIds: string[]
  lichessId?: string
  type?: 'owned' | 'community'
  order_index?: number
}

export interface StudyChapter {
  id: string
  studyId?: string
  name: string
  root: PgnNode
  tags: Record<string, string>
  savedPath: string
  color?: 'white' | 'black'
  lichessChapterId?: string
  start_position?: boolean
  chapter_type?: 'repertoire' | 'speedrun'
}

interface RawChapterRow {
  id: string
  studyId: string | null
  name: string
  tags: string
  savedPath: string
  config: string
  pgn_text: string
}

interface RawStudyRow {
  id: string
  title: string
  chapterIds: string
  lichessId?: string
  type?: 'owned' | 'community'
  order_index?: number
}

interface RawMetadataRow {
  node_path: string
  metadata: string
}

export class StudyRepository {
  /**
   * Helper to collect all metadata from a node tree into a flat map for storage.
   */
  private collectMetadata(node: PgnNode, currentPath: string = ''): Map<string, string> {
    const raw = toRaw(node)
    // Root node path is empty string, matching PgnService.buildPath()
    const nodePath = raw.id === '__ROOT__' ? '' : currentPath + raw.id
    const metaMap = new Map<string, string>()

    if (raw.metadata && Object.keys(raw.metadata).length > 0) {
      metaMap.set(nodePath, JSON.stringify(raw.metadata))
    }

    if (raw.children) {
      raw.children.forEach((child) => {
        // For children of root, currentPath remains empty
        const nextPath = raw.id === '__ROOT__' ? '' : nodePath
        const childMap = this.collectMetadata(child, nextPath)
        childMap.forEach((v, k) => metaMap.set(k, v))
      })
    }
    return metaMap
  }

  /**
   * Recursively injects metadata into a reconstructed tree.
   */
  private injectMetadata(node: PgnNode, metaMap: Map<string, Record<string, unknown>>, currentPath: string = ''): void {
    // Root node path is empty string
    const nodePath = node.id === '__ROOT__' ? '' : currentPath + node.id
    const meta = metaMap.get(nodePath)
    
    if (meta) {
      node.metadata = { ...node.metadata, ...meta }
    }

    if (node.children) {
      node.children.forEach(child => {
        const nextPath = node.id === '__ROOT__' ? '' : nodePath
        this.injectMetadata(child, metaMap, nextPath)
      })
    }
  }

  async getAllStudies(): Promise<Study[]> {
    const rows = await databaseClient.query<RawStudyRow>('user',
      'SELECT * FROM studies ORDER BY order_index ASC',
    )
    return rows.map((r) => ({
      ...r,
      chapterIds: JSON.parse(r.chapterIds) as string[],
    }))
  }

  async saveStudy(study: Study): Promise<void> {
    const raw = toRaw(study)
    await databaseClient.exec('user', `
      INSERT INTO studies (id, title, chapterIds, lichessId, type, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title       = excluded.title,
        chapterIds  = excluded.chapterIds,
        lichessId   = excluded.lichessId,
        type        = excluded.type,
        order_index = excluded.order_index
    `, [
      raw.id,
      raw.title,
      JSON.stringify(raw.chapterIds),
      raw.lichessId ?? null,
      raw.type ?? null,
      raw.order_index ?? 0
    ])
  }

  async getAllChapters(): Promise<StudyChapter[]> {
    const rows = await databaseClient.query<RawChapterRow>('user',
      'SELECT * FROM chapters',
    )
    
    const chapters: StudyChapter[] = []
    for (const r of rows) {
      // 1. Parse PGN to get base tree
      const importResult = pgnParserService.parse(r.pgn_text)
      if (!importResult) continue

      // 2. Load and inject metadata
      const metaRows = await databaseClient.query<RawMetadataRow>('user',
        'SELECT node_path, metadata FROM node_metadata WHERE chapter_id = ?',
        [r.id]
      )
      
      const metaMap = new Map<string, Record<string, unknown>>()
      metaRows.forEach(row => {
        try { metaMap.set(row.node_path, JSON.parse(row.metadata) as Record<string, unknown>) } catch { /* ignore corrupted meta */ }
      })

      this.injectMetadata(importResult.root, metaMap)
      
      const config = JSON.parse(r.config ?? '{}') as Partial<StudyChapter>

      chapters.push({
        id: r.id,
        studyId: r.studyId ?? undefined,
        name: r.name,
        root: importResult.root,
        tags: importResult.tags,
        savedPath: r.savedPath,
        color: config.color,
        lichessChapterId: config.lichessChapterId,
        start_position: config.start_position,
        chapter_type: config.chapter_type,
      })
    }
    return chapters
  }

  async getChapterById(id: string): Promise<StudyChapter | null> {
    const rows = await databaseClient.query<RawChapterRow>('user',
      'SELECT * FROM chapters WHERE id = ?',
      [id]
    )
    
    if (rows.length === 0) return null
    const r = rows[0]!

    // 1. Parse PGN
    const importResult = pgnParserService.parse(r.pgn_text)
    if (!importResult) return null

    // 2. Load and inject metadata
    const metaRows = await databaseClient.query<RawMetadataRow>('user',
      'SELECT node_path, metadata FROM node_metadata WHERE chapter_id = ?',
      [r.id]
    )
    
    const metaMap = new Map<string, Record<string, unknown>>()
    metaRows.forEach(row => {
      try { metaMap.set(row.node_path, JSON.parse(row.metadata) as Record<string, unknown>) } catch { /* ignore */ }
    })

    this.injectMetadata(importResult.root, metaMap)

    const config = JSON.parse(r.config ?? '{}') as Partial<StudyChapter>

    return {
      id: r.id,
      studyId: r.studyId ?? undefined,
      name: r.name,
      root: importResult.root,
      tags: importResult.tags,
      savedPath: r.savedPath,
      color: config.color,
      lichessChapterId: config.lichessChapterId,
      start_position: config.start_position,
      chapter_type: config.chapter_type,
    }
  }

  async saveChapter(chapter: StudyChapter): Promise<void> {
    const raw = toRaw(chapter)
    
    // Generate PGN for storage
    const pgnText = pgnService.getFullPgn(raw.tags, raw.root)
    
    // Collect metadata for surgical update
    const metaMap = this.collectMetadata(raw.root)

    const config = JSON.stringify({
      color: raw.color,
      lichessChapterId: raw.lichessChapterId,
      start_position: raw.start_position,
      chapter_type: raw.chapter_type,
    })

    await databaseClient.transaction('user', async () => {
      // 1. Save chapter record + PGN
      await databaseClient.exec('user', `
        INSERT INTO chapters (id, studyId, name, tags, savedPath, config, pgn_text)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          studyId   = excluded.studyId,
          name      = excluded.name,
          tags      = excluded.tags,
          savedPath = excluded.savedPath,
          config    = excluded.config,
          pgn_text  = excluded.pgn_text
      `, [
        raw.id,
        raw.studyId ?? null,
        raw.name,
        JSON.stringify(raw.tags),
        raw.savedPath,
        config,
        pgnText
      ])

      // 2. Update metadata (Delete old, Insert current)
      // Note: We only save nodes that actually HAVE metadata (stats)
      await databaseClient.exec('user', 'DELETE FROM node_metadata WHERE chapter_id = ?', [raw.id])
      
      for (const [nodePath, metadata] of metaMap.entries()) {
        await databaseClient.exec('user', `
          INSERT INTO node_metadata (chapter_id, node_path, metadata)
          VALUES (?, ?, ?)
        `, [raw.id, nodePath, metadata])
      }
    })
  }

  /**
   * Surgical update for node metadata only.
   */
  async updateNodeMetadata(chapterId: string, nodePath: string, metadata: Record<string, unknown> | null): Promise<void> {
    if (!metadata || Object.keys(metadata).length === 0) {
      await databaseClient.exec('user', 'DELETE FROM node_metadata WHERE chapter_id = ? AND node_path = ?', [chapterId, nodePath])
      return
    }

    await databaseClient.exec('user', `
      INSERT INTO node_metadata (chapter_id, node_path, metadata)
      VALUES (?, ?, ?)
      ON CONFLICT(chapter_id, node_path) DO UPDATE SET
        metadata = excluded.metadata
    `, [
      chapterId,
      nodePath,
      JSON.stringify(metadata)
    ])
  }

  async deleteChapter(id: string): Promise<void> {
    await databaseClient.transaction('user', async () => {
      await databaseClient.exec('user', 'DELETE FROM chapters WHERE id = ?', [id])
      // node_metadata will be deleted via ON DELETE CASCADE
    })
  }

  async deleteStudy(id: string): Promise<void> {
    await databaseClient.transaction('user', async () => {
      await databaseClient.exec('user', 'DELETE FROM studies WHERE id = ?', [id])
      // cascade will handle chapters and node_metadata
    })
  }
}

export const studyRepository = new StudyRepository()
