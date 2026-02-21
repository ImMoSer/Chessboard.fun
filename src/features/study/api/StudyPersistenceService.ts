import { type StudyChapter } from '@/features/study/model/study.store'
import { type PgnNode } from '@/shared/lib/pgn/PgnService'
import { studyDb } from '@/db/StudyDatabase'
import { toRaw } from 'vue'

class StudyPersistenceService {
  /**
   * Prepares a chapter for storage by removing circular parent references
   */
  private cleanNodeForStorage(node: PgnNode): PgnNode {
    const rawNode = toRaw(node)
    const cleaned: PgnNode = { ...rawNode }
    delete cleaned.parent
    if (cleaned.children) {
      cleaned.children = cleaned.children.map((child: PgnNode) => this.cleanNodeForStorage(child))
    }
    return cleaned as PgnNode
  }

  /**
   * Restores parent references in a tree after loading from storage
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

  private saveTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

  async saveChapter(chapter: StudyChapter): Promise<void> {
    // Throttle saving for the same chapter
    if (this.saveTimeouts.has(chapter.id)) {
      clearTimeout(this.saveTimeouts.get(chapter.id))
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(async () => {
        this.saveTimeouts.delete(chapter.id)
        try {
          const rawChapter = toRaw(chapter)
          const cleanedChapter: StudyChapter = {
            ...rawChapter,
            root: this.cleanNodeForStorage(rawChapter.root),
          }
          await studyDb.chapters.put(cleanedChapter)
          resolve()
        } catch (error) {
          console.error('[StudyPersistenceService] Error saving chapter:', error)
          resolve()
        }
      }, 1000) // 1 second throttle

      this.saveTimeouts.set(chapter.id, timeout)
    })
  }

  async getAllChapters(): Promise<StudyChapter[]> {
    try {
      const chapters = await studyDb.chapters.toArray()
      for (const chapter of chapters) {
        this.restoreParentReferences(chapter.root)
      }
      return chapters
    } catch (error) {
      console.error('[StudyPersistenceService] Error loading chapters:', error)
      return []
    }
  }

  async deleteChapter(id: string): Promise<void> {
    try {
      await studyDb.chapters.delete(id)
    } catch (error) {
      console.error('[StudyPersistenceService] Error deleting chapter:', error)
    }
  }

  async clearAll(): Promise<void> {
    await studyDb.chapters.clear()
  }
}

export const studyPersistenceService = new StudyPersistenceService()
