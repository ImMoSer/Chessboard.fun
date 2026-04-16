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
  root: string
  tags: string
  savedPath: string
  config: string
}

interface RawStudyRow {
  id: string
  title: string
  chapterIds: string
  lichessId?: string
  type?: 'owned' | 'community'
  order_index?: number
}

interface RawNodeRow {
  id: string
  chapter_id: string
  parent_id: string | null
  ply: number
  variation_order: number
  san: string
  uci: string
  fen_before: string
  fen_after: string
  comment: string | null
  eval: number | null
  nag: number | null
  is_collapsed: number
  shapes: string | null
  metadata: string | null
}

export class StudyRepository {
  /**
   * Remove circular parent references and prepare nodes for relational storage.
   */
  private flattenNodes(node: PgnNode, chapterId: string, parentId: string | null = null, variationOrder: number = 0): RawNodeRow[] {
    const raw = toRaw(node)
    const current = {
      id: raw.id,
      chapter_id: chapterId,
      parent_id: parentId,
      ply: raw.ply,
      variation_order: variationOrder,
      san: raw.san,
      uci: raw.uci,
      fen_before: raw.fenBefore,
      fen_after: raw.fenAfter,
      comment: raw.comment || null,
      eval: raw.eval !== undefined ? raw.eval : null,
      nag: raw.nag || null,
      is_collapsed: raw.isCollapsed ? 1 : 0,
      shapes: raw.shapes ? JSON.stringify(raw.shapes) : null,
      metadata: raw.metadata ? JSON.stringify(raw.metadata) : null,
    }

    let nodes = [current]
    if (raw.children) {
      raw.children.forEach((child, index) => {
        nodes = nodes.concat(this.flattenNodes(child, chapterId, raw.id, index))
      })
    }
    return nodes
  }

  /**
   * Reconstruct tree from flat rows.
   */
  private reconstructTree(rows: RawNodeRow[]): PgnNode {
    const nodeMap = new Map<string, PgnNode>()

    // 1. Create all nodes
    for (const row of rows) {
      const node: PgnNode = {
        id: row.id,
        ply: row.ply,
        san: row.san,
        uci: row.uci,
        fenBefore: row.fen_before,
        fenAfter: row.fen_after,
        children: [],
        comment: row.comment || undefined,
        eval: row.eval !== null ? row.eval : undefined,
        nag: row.nag || undefined,
        isCollapsed: row.is_collapsed === 1,
        shapes: row.shapes ? JSON.parse(row.shapes) : undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      }
      nodeMap.set(row.id, node)
    }

    // 2. Link parents and children
    let root: PgnNode | null = null
    for (const row of rows) {
      const node = nodeMap.get(row.id)!
      if (row.parent_id) {
        const parent = nodeMap.get(row.parent_id)
        if (parent) {
          node.parent = parent
          parent.children.push(node)
        }
      } else {
        root = node
      }
    }

    if (!root) throw new Error('Root node not found in reconstructed tree')
    return root
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
      const nodeRows = await databaseClient.query<RawNodeRow>('user',
        'SELECT * FROM chapter_nodes WHERE chapter_id = ? ORDER BY variation_order ASC',
        [r.id]
      )
      
      const pgnTree = this.reconstructTree(nodeRows)
      const config = JSON.parse(r.config ?? '{}') as Partial<StudyChapter>

      chapters.push({
        id: r.id,
        studyId: r.studyId ?? undefined,
        name: r.name,
        root: pgnTree,
        tags: JSON.parse(r.tags) as Record<string, string>,
        savedPath: r.savedPath,
        color: config.color,
        lichessChapterId: config.lichessChapterId,
        start_position: config.start_position,
        chapter_type: config.chapter_type,
      })
    }
    return chapters
  }

  async saveChapter(chapter: StudyChapter): Promise<void> {
    const raw = toRaw(chapter)
    const flatNodes = this.flattenNodes(raw.root, raw.id)

    const config = JSON.stringify({
      color: raw.color,
      lichessChapterId: raw.lichessChapterId,
      start_position: raw.start_position,
      chapter_type: raw.chapter_type,
    })

    // Use transaction for performance and atomicity
    await databaseClient.transaction('user', async () => {
      // 1. Save chapter meta
      await databaseClient.exec('user', `
        INSERT INTO chapters (id, studyId, name, tags, savedPath, config)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          studyId   = excluded.studyId,
          name      = excluded.name,
          tags      = excluded.tags,
          savedPath = excluded.savedPath,
          config    = excluded.config
      `, [
        raw.id,
        raw.studyId ?? null,
        raw.name,
        JSON.stringify(raw.tags),
        raw.savedPath,
        config,
      ])

      // 2. Clear old nodes (Zombie-Node Problem Fix)
      await databaseClient.exec('user', 'DELETE FROM chapter_nodes WHERE chapter_id = ?', [raw.id])
      
      // 3. Insert new nodes (Transaction ensures this is fast)
      for (const node of flatNodes) {
        await databaseClient.exec('user', `
          INSERT OR REPLACE INTO chapter_nodes (
            id, chapter_id, parent_id, ply, variation_order, san, uci, fen_before, fen_after, 
            comment, eval, nag, is_collapsed, shapes, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          node.id, node.chapter_id, node.parent_id, node.ply, node.variation_order, node.san, node.uci, 
          node.fen_before, node.fen_after, node.comment, node.eval, node.nag, 
          node.is_collapsed, node.shapes, node.metadata
        ])
      }
    })
  }

  async deleteChapter(id: string): Promise<void> {
    await databaseClient.transaction('user', async () => {
      await databaseClient.exec('user', 'DELETE FROM chapters WHERE id = ?', [id])
      await databaseClient.exec('user', 'DELETE FROM chapter_nodes WHERE chapter_id = ?', [id])
    })
  }

  async deleteStudy(id: string): Promise<void> {
    await databaseClient.transaction('user', async () => {
      const rows = await databaseClient.query<{ id: string }>('user', 'SELECT id FROM chapters WHERE studyId = ?', [id])
      for (const row of rows) {
        await databaseClient.exec('user', 'DELETE FROM chapter_nodes WHERE chapter_id = ?', [row.id])
      }
      await databaseClient.exec('user', 'DELETE FROM studies WHERE id = ?', [id])
      await databaseClient.exec('user', 'DELETE FROM chapters WHERE studyId = ?', [id])
    })
  }
}

export const studyRepository = new StudyRepository()
