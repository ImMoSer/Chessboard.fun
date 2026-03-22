import Dexie, { type Table } from 'dexie'
import { type StudyChapter, type Study } from '../model/study.store'

export class StudyDatabase extends Dexie {
  chapters!: Table<StudyChapter>
  studies!: Table<Study>

  constructor() {
    super('StudyDatabase')
    this.version(3).stores({
      chapters: 'id, name, studyId, ownerId', // Primary key is id, index name, studyId, and ownerId
      studies: 'id, title, ownerId',
    })
  }
}

export const studyDb = new StudyDatabase()
