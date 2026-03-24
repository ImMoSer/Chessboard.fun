import { type StudyChapter, type Study } from '../index'
import { type PgnNode } from '@/shared/lib/pgn/PgnService'
import { toRaw } from 'vue'
import { studyDb } from './StudyDatabase'

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

  async saveChapter(chapter: StudyChapter, ownerId: string): Promise<void> {
    // Throttle saving for the same chapter
    if (this.saveTimeouts.has(chapter.id)) {
      clearTimeout(this.saveTimeouts.get(chapter.id))
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(async () => {
        this.saveTimeouts.delete(chapter.id)
        try {
          const rawChapter = toRaw(chapter)
          const cleanedChapter: StudyChapter & { ownerId: string } = {
            ...rawChapter,
            ownerId, // Bind to the specific user
            root: this.cleanNodeForStorage(rawChapter.root),
          }
          await studyDb.chapters.put(cleanedChapter as unknown as StudyChapter)
          resolve()
        } catch (error) {
          console.error('[StudyPersistenceService] Error saving chapter:', error)
          resolve()
        }
      }, 1000) // 1 second throttle

      this.saveTimeouts.set(chapter.id, timeout)
    })
  }

  async saveChaptersBulk(chapters: StudyChapter[], ownerId: string): Promise<void> {
    try {
      const cleanedChapters = chapters.map(chapter => {
        const rawChapter = toRaw(chapter)
        return {
          ...rawChapter,
          ownerId,
          root: this.cleanNodeForStorage(rawChapter.root),
        } as unknown as StudyChapter
      })
      await studyDb.chapters.bulkPut(cleanedChapters)
    } catch (error) {
      console.error('[StudyPersistenceService] Error saving chapters in bulk:', error)
    }
  }

  async saveStudy(study: Study, ownerId: string): Promise<void> {
    try {
      const rawStudy = toRaw(study)
      await studyDb.studies.put({ ...rawStudy, ownerId } as unknown as Study)
    } catch (error) {
      console.error('[StudyPersistenceService] Error saving study:', error)
    }
  }

  async getAllChapters(ownerId: string): Promise<StudyChapter[]> {
    try {
      const chapters = await studyDb.chapters.where('ownerId').equals(ownerId).toArray()
      for (const chapter of chapters) {
        this.restoreParentReferences(chapter.root)
      }
      return chapters
    } catch (error) {
      console.error('[StudyPersistenceService] Error loading chapters:', error)
      return []
    }
  }

  async getAllStudies(ownerId: string): Promise<Study[]> {
    try {
      return await studyDb.studies.where('ownerId').equals(ownerId).toArray()
    } catch (error) {
      console.error('[StudyPersistenceService] Error loading studies:', error)
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

  async deleteStudy(id: string): Promise<void> {
    try {
      await studyDb.studies.delete(id)
    } catch (error) {
      console.error('[StudyPersistenceService] Error deleting study:', error)
    }
  }

  async deleteChaptersByStudyId(studyId: string): Promise<void> {
    try {
      await studyDb.chapters.where('studyId').equals(studyId).delete()
    } catch (error) {
      console.error('[StudyPersistenceService] Error deleting chapters by studyId:', error)
    }
  }

  async clearAll(): Promise<void> {
    await studyDb.chapters.clear()
    await studyDb.studies.clear()
  }
}

export const studyPersistenceService = new StudyPersistenceService()
