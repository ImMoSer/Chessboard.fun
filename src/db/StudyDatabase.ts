import Dexie, { type Table } from 'dexie'
import { type StudyChapter } from '@/features/study/model/study.store'

export class StudyDatabase extends Dexie {
  chapters!: Table<StudyChapter>

  constructor() {
    super('StudyDatabase')
    this.version(1).stores({
      chapters: 'id, name', // Primary key is id, name is indexed for potential search
    })
  }
}

export const studyDb = new StudyDatabase()
