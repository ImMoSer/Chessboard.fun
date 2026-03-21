import Dexie, { type Table } from 'dexie'
import { type StudyChapter, type Study } from '../model/study.store'

export class StudyDatabase extends Dexie {
  chapters!: Table<StudyChapter>
  studies!: Table<Study>

  constructor() {
    super('StudyDatabase')
    this.version(2).stores({
      chapters: 'id, name, studyId', // Primary key is id, index name and studyId
      studies: 'id, title',
    })
  }
}

export const studyDb = new StudyDatabase()
