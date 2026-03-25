import Dexie, { type Table } from 'dexie'
import { type StudyChapter, type Study } from '../model/study.store'

export class StudyDatabase extends Dexie {
  chapters!: Table<StudyChapter>
  studies!: Table<Study>

  constructor() {
    super('StudyDatabase')
    this.version(4).stores({
      chapters: '[id+ownerId], [studyId+ownerId], ownerId', // Composite primary key and composite index
      studies: '[id+ownerId], ownerId',
    })
  }
}

export const studyDb = new StudyDatabase()
