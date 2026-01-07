import { type StudyChapter } from '@/stores/study.store';
import { type PgnNode } from '@/services/PgnService';
import { studyDb } from '@/db/StudyDatabase';

class StudyPersistenceService {
  /**
   * Prepares a chapter for storage by removing circular parent references
   */
  private cleanNodeForStorage(node: PgnNode): PgnNode {
    const cleaned: PgnNode = { ...node };
    delete cleaned.parent;
    if (cleaned.children) {
      cleaned.children = cleaned.children.map((child: PgnNode) => this.cleanNodeForStorage(child));
    }
    return cleaned as PgnNode;
  }

  /**
   * Restores parent references in a tree after loading from storage
   */
  private restoreParentReferences(node: PgnNode, parent?: PgnNode): void {
    if (parent) {
      node.parent = parent;
    }
    if (node.children) {
      for (const child of node.children) {
        this.restoreParentReferences(child, node);
      }
    }
  }

  async saveChapter(chapter: StudyChapter): Promise<void> {
    try {
      const cleanedChapter: StudyChapter = {
        ...chapter,
        root: this.cleanNodeForStorage(chapter.root)
      };
      await studyDb.chapters.put(cleanedChapter);
    } catch (error) {
      console.error('[StudyPersistenceService] Error saving chapter:', error);
    }
  }

  async getAllChapters(): Promise<StudyChapter[]> {
    try {
      const chapters = await studyDb.chapters.toArray();
      for (const chapter of chapters) {
        this.restoreParentReferences(chapter.root);
      }
      return chapters;
    } catch (error) {
      console.error('[StudyPersistenceService] Error loading chapters:', error);
      return [];
    }
  }

  async deleteChapter(id: string): Promise<void> {
    try {
      await studyDb.chapters.delete(id);
    } catch (error) {
      console.error('[StudyPersistenceService] Error deleting chapter:', error);
    }
  }

  async clearAll(): Promise<void> {
    await studyDb.chapters.clear();
  }
}

export const studyPersistenceService = new StudyPersistenceService();
