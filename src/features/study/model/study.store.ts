import { useBoardStore } from '@/entities/game'
import { useAuthStore } from '@/entities/user'
import { studyPersistenceService } from '../api/StudyPersistenceService'
import { pgnParserService } from '@/shared/lib/pgn/PgnParserService'
import { pgnService, pgnTreeVersion, type PgnNode } from '@/shared/lib/pgn/PgnService'
import { makeFen, parseFen } from 'chessops/fen'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export interface Study {
  id: string // e.g. generateId() or Lichess ID 'bUmjtT4G'
  title: string
  description?: string
  chapterIds: string[] // List of chapter IDs in order
  lichessId?: string
  ownerId?: string
}

export interface StudyChapter {
  id: string
  name: string
  root: PgnNode // The reference to the tree
  tags: Record<string, string>
  savedPath: string // To restore cursor location
  color?: 'white' | 'black'
  studyId?: string // Reference to parent Study
}

export const useStudyStore = defineStore('study', () => {
  const boardStore = useBoardStore()
  const authStore = useAuthStore()

  const studies = ref<Study[]>([])
  const chapters = ref<StudyChapter[]>([])
  const activeChapterId = ref<string | null>(null)
  const isInitialized = ref(false)
  const cloudLoading = ref(false)

  const activeChapter = computed(() => chapters.value.find((c) => c.id === activeChapterId.value))
  
  const activeStudy = computed(() => {
    if (!activeChapter.value?.studyId) return null
    return studies.value.find((s) => s.id === activeChapter.value?.studyId) || null
  })

  const isOwner = computed(() => {
    // Since we don't have cloud chapters anymore, local chapters are always owned
    return true
  })

  function generateId(): string {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
  }

  async function initialize() {
    if (isInitialized.value) return

    const loadedChapters = await studyPersistenceService.getAllChapters()
    if (loadedChapters.length > 0) {
      chapters.value = loadedChapters
    }

    const loadedStudies = await studyPersistenceService.getAllStudies()
    if (loadedStudies.length > 0) {
      studies.value = loadedStudies
    }

    if (chapters.value.length > 0) {
      const lastId = localStorage.getItem('lastActiveChapterId')
      if (lastId && chapters.value.some((c) => c.id === lastId)) {
        setActiveChapter(lastId)
      } else {
        setActiveChapter(chapters.value[0]!.id)
      }
    }

    isInitialized.value = true
  }

  async function createStudy(title: string = 'New Study') {
    const id = generateId()
    const newStudy: Study = {
      id,
      title,
      chapterIds: [],
      ownerId: authStore.userProfile?.id
    }
    studies.value.push(newStudy)
    await studyPersistenceService.saveStudy(newStudy)
    
    // Create first chapter for the new study
    const firstChapterId = await createChapter('Chapter 1', undefined, 'white', id)
    setActiveChapter(firstChapterId)
    return id
  }

  async function createChapter(
    name: string = 'New Chapter',
    startFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    color?: 'white' | 'black',
    studyId?: string,
  ) {
    if (!studyId && activeStudy.value) {
      studyId = activeStudy.value.id
    }
    
    if (!studyId) {
      throw new Error('Cannot create chapter without a studyId')
    }

    const study = studies.value.find(s => s.id === studyId)
    if (!study) throw new Error('Study not found')
    
    if (study.chapterIds.length >= 64) {
      throw new Error('A study cannot have more than 64 chapters.')
    }

    let normalizedFen = startFen
    try {
      const setup = parseFen(startFen).unwrap()
      normalizedFen = makeFen(setup)
    } catch (e) {
      console.error('Invalid FEN for new chapter', e)
    }

    const root: PgnNode = {
      id: '__ROOT__',
      ply: 0,
      fenBefore: '',
      fenAfter: normalizedFen,
      san: '',
      uci: '',
      children: [],
    }

    const now = new Date()
    const utcDate = now.toISOString().split('T')[0]?.replace(/-/g, '.') || ''
    const utcTime = now.toISOString().split('T')[1]?.split('.')[0] || ''
    const lichessId = authStore.userProfile?.id || 'Anonymous'

    const id = generateId()
    const newChapter: StudyChapter = {
      id,
      name,
      root,
      tags: {
        Event: name,
        Site: 'LOCAL',
        Result: '*',
        UTCDate: utcDate,
        UTCTime: utcTime,
        Variant: 'Standard',
        ECO: 'NULL',
        Opening: 'NULL',
        Annotator: `https://lichess.org/@/${lichessId}`,
      },
      savedPath: '',
      color,
      studyId,
    }

    chapters.value.push(newChapter)
    study.chapterIds.push(id)

    // Save immediately
    await studyPersistenceService.saveChapter(newChapter)
    await studyPersistenceService.saveStudy(study)

    return id
  }

  async function createChapterFromPgn(
    pgn: string,
    nameOverride?: string,
    colorOverride?: 'white' | 'black',
    studyId?: string,
  ) {
    try {
      const { tags, root } = pgnParserService.parse(pgn)

      const color =
        colorOverride ||
        (tags['White'] === 'Player' ? 'white' : tags['Black'] === 'Player' ? 'black' : undefined)

      let name = nameOverride || tags['Event'] || 'Imported Chapter'
      if (!nameOverride && tags['White'] && tags['Black']) {
        name = `${tags['White']} - ${tags['Black']}`
      }

      // Ensure study exists
      if (!studyId) {
        studyId = await createStudy(name)
      }

      const study = studies.value.find(s => s.id === studyId)
      if (!study) throw new Error('Study not found')

      const id = generateId()
      
      const now = new Date()
      const utcDate = now.toISOString().split('T')[0]?.replace(/-/g, '.') || ''
      const utcTime = now.toISOString().split('T')[1]?.split('.')[0] || ''
      const lichessId = authStore.userProfile?.id || 'Anonymous'

      const newChapter: StudyChapter = {
        id,
        name,
        root,
        tags: {
          Event: name,
          Site: 'LOCAL',
          Result: tags['Result'] || '*',
          UTCDate: tags['UTCDate'] || utcDate,
          UTCTime: tags['UTCTime'] || utcTime,
          Variant: tags['Variant'] || 'Standard',
          ECO: tags['ECO'] || 'NULL',
          Opening: tags['Opening'] || 'NULL',
          Annotator: tags['Annotator'] || `https://lichess.org/@/${lichessId}`,
          ...tags, // Keep other original tags
        },
        savedPath: '',
        color,
        studyId,
      }

      chapters.value.push(newChapter)
      study.chapterIds.push(id)

      await studyPersistenceService.saveChapter(newChapter)
      await studyPersistenceService.saveStudy(study)

      setActiveChapter(id)
      return id
    } catch (e) {
      console.error('Failed to create chapter from PGN', e)
      throw e
    }
  }

  async function deleteChapter(id: string) {
    const index = chapters.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      const chapterToDelete = chapters.value[index]

      // Remove from study if it belongs to one
      if (chapterToDelete?.studyId) {
        const study = studies.value.find(s => s.id === chapterToDelete.studyId)
        if (study) {
          study.chapterIds = study.chapterIds.filter(cid => cid !== id)
          await studyPersistenceService.saveStudy(study)
        }
      }

      chapters.value.splice(index, 1)
      await studyPersistenceService.deleteChapter(id)

      if (chapters.value.length === 0) {
        activeChapterId.value = null
        return
      }

      if (activeChapterId.value === id) {
        const next = chapters.value[0]
        if (next) setActiveChapter(next.id)
      }
    }
  }

  async function deleteStudy(id: string) {
    const index = studies.value.findIndex((s) => s.id === id)
    if (index !== -1) {
      studies.value.splice(index, 1)
      await studyPersistenceService.deleteStudy(id)
    }
  }

  function setActiveChapter(id: string) {
    // 1. Save state of current chapter (cursor position)
    if (activeChapterId.value) {
      const prev = chapters.value.find((c) => c.id === activeChapterId.value)
      if (prev) {
        prev.savedPath = pgnService.getCurrentPath()
        // We should also save it to DB to persist the cursor position
        studyPersistenceService.saveChapter(prev)
      }
    }

    // 2. Switch
    const next = chapters.value.find((c) => c.id === id)
    if (next) {
      activeChapterId.value = id
      localStorage.setItem('lastActiveChapterId', id)
      pgnService.setRoot(next.root, next.savedPath)
      boardStore.syncBoardWithPgn()

      // Auto-flip board based on chapter color
      if (next.color) {
        boardStore.orientation = next.color
      }
    }
  }

  function updateChapterMetadata(
    id: string,
    metadata: Partial<Omit<StudyChapter, 'id' | 'root' | 'savedPath'>>,
  ) {
    const chapter = chapters.value.find((c) => c.id === id)
    if (chapter) {
      if (metadata.name) chapter.name = metadata.name
      if (metadata.tags) chapter.tags = { ...chapter.tags, ...metadata.tags }
      studyPersistenceService.saveChapter(chapter)
    }
  }

  // --- LICHESS IMPORT ---
  async function importFromLichess(studyId: string): Promise<string | null> {
    cloudLoading.value = true
    try {
      const response = await fetch(`https://lichess.org/api/study/${studyId}.pgn`)
      if (!response.ok) {
        throw new Error(`Failed to fetch study: ${response.statusText}`)
      }
      const pgnData = await response.text()
      const importResults = pgnParserService.parseMultiple(pgnData)
      
      if (importResults.length === 0) {
        throw new Error('No chapters found in the study.')
      }

      // Extract study title
      const firstTags = importResults[0]?.tags || {}
      let studyTitle = firstTags['StudyName']
      
      // Fallback: If no StudyName tag, try to split Event "Study: Chapter"
      if (!studyTitle && firstTags['Event']) {
        if (firstTags['Event'].includes(': ')) {
          studyTitle = firstTags['Event'].split(': ')[0]
        } else {
          studyTitle = firstTags['Event']
        }
      }
      
      if (!studyTitle) {
        studyTitle = `Lichess Study ${studyId}`
      }
      
      const study: Study = {
        id: studyId, // Use lichess ID as our local study ID
        title: studyTitle,
        lichessId: studyId,
        chapterIds: [],
        ownerId: authStore.userProfile?.id
      }

      // Check if study already exists to avoid duplicate chapters
      const existingStudyIndex = studies.value.findIndex(s => s.id === studyId)
      if (existingStudyIndex !== -1) {
        // Study exists, we overwrite the study object
        studies.value[existingStudyIndex] = study
        // Also remove old chapters of this study from the local chapters list
        chapters.value = chapters.value.filter(c => c.studyId !== studyId)
      } else {
        studies.value.push(study)
      }

      let firstChapterId: string | null = null

      for (let i = 0; i < importResults.length; i++) {
        const { tags, root } = importResults[i]!
        const chapterId = generateId()
        
        // Extract chapter name
        let chapterName = tags['ChapterName']
        
        // Fallback: If no ChapterName tag, try to get it from Event
        if (!chapterName && tags['Event']) {
          if (tags['Event'].includes(': ')) {
            // "Study: Chapter" -> take only "Chapter"
            chapterName = tags['Event'].split(': ').slice(1).join(': ')
          } else {
            chapterName = tags['Event']
          }
        }

        if (!chapterName) {
          chapterName = `Chapter ${i + 1}`
        }

        const newChapter: StudyChapter = {
          id: chapterId,
          name: chapterName,
          root,
          tags,
          savedPath: '',
          studyId: study.id,
        }

        chapters.value.push(newChapter)
        study.chapterIds.push(chapterId)
        await studyPersistenceService.saveChapter(newChapter)
        
        if (i === 0) firstChapterId = chapterId
      }

      await studyPersistenceService.saveStudy(study)

      if (firstChapterId) {
        setActiveChapter(firstChapterId)
      }
      
      return study.id
    } catch (e) {
      console.error('Failed to import Lichess study', e)
      throw e
    } finally {
      cloudLoading.value = false
    }
  }

  // Auto-save active chapter when tree changes
  watch(
    pgnTreeVersion,
    () => {
      if (activeChapter.value) {
        // Update savedPath to current before saving
        activeChapter.value.savedPath = pgnService.getCurrentPath()
        studyPersistenceService.saveChapter(activeChapter.value)
      }
    },
    { deep: false },
  )

  return {
    studies,
    chapters,
    activeChapterId,
    activeChapter,
    activeStudy,
    isInitialized,
    cloudLoading,
    isOwner,
    initialize,
    createStudy,
    createChapter,
    createChapterFromPgn,
    deleteChapter,
    deleteStudy,
    saveStudy: studyPersistenceService.saveStudy.bind(studyPersistenceService),
    setActiveChapter,
    updateChapterMetadata,
    importFromLichess,
  }
})

