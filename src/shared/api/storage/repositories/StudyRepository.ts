import { databaseClient } from '../DatabaseClient'
import { toRaw } from 'vue'
import type { PgnNode } from '@/shared/lib/pgn/PgnService'

export interface Study {
  id: string
  title: string
  chapterIds: string[]
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
  type?: 'owned' | 'community'
  order_index?: number
}

export class StudyRepository {
  /**
   * Remove circular parent references before serializing to JSON.
   */
  private cleanNodeForStorage(node: PgnNode): PgnNode {
    const rawNode = toRaw(node)
    const cleaned: PgnNode = { ...rawNode }
    delete cleaned.parent
    if (cleaned.children) {
      cleaned.children = cleaned.children.map((child: PgnNode) =>
        this.cleanNodeForStorage(child),
      )
    }
    return cleaned
  }

  /**
   * Re-attach parent references after loading from storage.
   */
  private restoreParentReferences(node: PgnNode, parent?: PgnNode): void {
    if (parent) {
      node.parent = parent
    }
    if (node.children) {
      for (const child of node.children) {
        this.restoreParentReferences(child, node)
      }
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
      INSERT INTO studies (id, title, chapterIds, type, order_index)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title       = excluded.title,
        chapterIds  = excluded.chapterIds,
        type        = excluded.type,
        order_index = excluded.order_index
    `, [raw.id, raw.title, JSON.stringify(raw.chapterIds), raw.type ?? null, raw.order_index ?? 0])
  }

  async getAllChapters(): Promise<StudyChapter[]> {
    const rows = await databaseClient.query<RawChapterRow>('user',
      'SELECT * FROM chapters',
    )
    return rows.map((r) => {
      const pgnTree = JSON.parse(r.root) as PgnNode
      this.restoreParentReferences(pgnTree)

      const config = JSON.parse(r.config ?? '{}') as Partial<StudyChapter>

      return {
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
      }
    })
  }

  async saveChapter(chapter: StudyChapter): Promise<void> {
    const raw = toRaw(chapter)
    const cleanedTree = this.cleanNodeForStorage(raw.root)

    const config = JSON.stringify({
      color: raw.color,
      lichessChapterId: raw.lichessChapterId,
      start_position: raw.start_position,
      chapter_type: raw.chapter_type,
    })

    await databaseClient.exec('user', `
      INSERT INTO chapters (id, studyId, name, root, tags, savedPath, config)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        studyId   = excluded.studyId,
        name      = excluded.name,
        root      = excluded.root,
        tags      = excluded.tags,
        savedPath = excluded.savedPath,
        config    = excluded.config
    `, [
      raw.id,
      raw.studyId ?? null,
      raw.name,
      JSON.stringify(cleanedTree),
      JSON.stringify(raw.tags),
      raw.savedPath,
      config,
    ])
  }

  async deleteChapter(id: string): Promise<void> {
    await databaseClient.exec('user', 'DELETE FROM chapters WHERE id = ?', [id])
  }

  async deleteStudy(id: string): Promise<void> {
    await databaseClient.exec('user', 'DELETE FROM studies WHERE id = ?', [id])
    await databaseClient.exec('user', 'DELETE FROM chapters WHERE studyId = ?', [id])
  }
}

export const studyRepository = new StudyRepository()
