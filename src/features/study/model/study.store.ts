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

  function createChapter(
    name: string = 'New Chapter',
    startFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    color?: 'white' | 'black',
    studyId?: string,
  ) {
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

    const id = generateId()
    const newChapter: StudyChapter = {
      id,
      name,
      root,
      tags: {
        Event: name,
        Site: 'Chess App Study',
        Date: new Date().toISOString().split('T')[0] ?? '',
        White: color === 'white' ? 'Player' : 'Opponent',
        Black: color === 'black' ? 'Player' : 'Opponent',
      },
      savedPath: '',
      color,
      studyId,
    }

    chapters.value.push(newChapter)

    // Save immediately
    studyPersistenceService.saveChapter(newChapter)

    if (studyId) {
      const study = studies.value.find(s => s.id === studyId)
      if (study) {
        study.chapterIds.push(id)
        studyPersistenceService.saveStudy(study)
      }
    }

    // If it's the first chapter or we just created it and want to switch
    if (chapters.value.length === 1) {
      setActiveChapter(id)
    }

    return id
  }

  function createChapterFromPgn(
    pgn: string,
    nameOverride?: string,
    colorOverride?: 'white' | 'black',
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

      const id = generateId()
      const newChapter: StudyChapter = {
        id,
        name,
        root,
        tags: { ...tags, Event: name },
        savedPath: '',
        color,
      }

      chapters.value.push(newChapter)
      studyPersistenceService.saveChapter(newChapter)

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
        createChapter('My Repertoire', undefined, 'white')
        return
      }

      if (activeChapterId.value === id) {
        const next = chapters.value[0]
        if (next) setActiveChapter(next.id)
      }
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

      // Try to extract study title from the first chapter's tags (usually Event or Site)
      const firstTags = importResults[0]?.tags || {}
      const studyTitle = firstTags['Event'] || `Lichess Study ${studyId}`
      
      // Sometimes Lichess sets Event to chapter name and puts study URL in Site. We can adjust logic as needed.
      if (firstTags['Site'] && firstTags['Site'].includes(studyId)) {
        // We might not have the global study name in the PGN, just chapter names in Event.
        // We use the first chapter's Event as study title if we can't find a better one, or just "Lichess Study X"
      }

      const study: Study = {
        id: studyId, // Use lichess ID as our local study ID
        title: studyTitle,
        lichessId: studyId,
        chapterIds: [],
        ownerId: authStore.userProfile?.id
      }

      // Check if study already exists to avoid duplicate chapters, or we just overwrite/append?
      // Let's create fresh for now. If it exists, we might want to delete old chapters first, but let's keep it simple.
      const existingStudyIndex = studies.value.findIndex(s => s.id === studyId)
      if (existingStudyIndex !== -1) {
        // If it exists, maybe delete old chapters? For now just overwrite the study object
      } else {
        studies.value.push(study)
      }

      let firstChapterId: string | null = null

      for (let i = 0; i < importResults.length; i++) {
        const { tags, root } = importResults[i]!
        const chapterId = generateId()
        
        const chapterName = tags['Event'] || `Chapter ${i + 1}`

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
    isInitialized,
    cloudLoading,
    isOwner,
    initialize,
    createChapter,
    createChapterFromPgn,
    deleteChapter,
    setActiveChapter,
    updateChapterMetadata,
    importFromLichess,
  }
})

