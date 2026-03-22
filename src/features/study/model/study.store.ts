import { useBoardStore } from '@/entities/game'
import { useAuthStore } from '@/entities/user'
import { studyPersistenceService } from '../api/StudyPersistenceService'
import { lichessSyncService, type LichessStudyCreateRequest } from '../api/LichessSyncService'
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
  // Lichess creation settings
  visibility?: 'public' | 'unlisted' | 'private'
  chat?: string
  cloneable?: string
  computer?: string
  explorer?: string
  shareable?: string
}

export interface StudyChapter {
  id: string
  name: string
  root: PgnNode // The reference to the tree
  tags: Record<string, string>
  savedPath: string // To restore cursor location
  color?: 'white' | 'black'
  studyId?: string // Reference to parent Study
  lichessChapterId?: string // Lichess internal chapter ID (e.g. BHEJGiPB)
}

export const useStudyStore = defineStore('study', () => {
  const boardStore = useBoardStore()
  const authStore = useAuthStore()

  const studies = ref<Study[]>([])
  const chapters = ref<StudyChapter[]>([])
  const activeChapterId = ref<string | null>(null)
  const isInitialized = ref(false)
  const cloudLoading = ref(false)
  const isAuthModalVisible = ref(false)

  const activeChapter = computed(() => chapters.value.find((c) => c.id === activeChapterId.value))
  
  const activeStudy = computed(() => {
    if (!activeChapter.value?.studyId) return null
    return studies.value.find((s) => s.id === activeChapter.value?.studyId) || null
  })

  async function requireLichessAccess(): Promise<boolean> {
    const hasToken = await lichessSyncService.ensureToken()
    if (!hasToken) {
      isAuthModalVisible.value = true
      return false
    }
    return true
  }

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

  async function deleteChapter(id: string, removeFromLichess: boolean = false) {
    const index = chapters.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      const chapterToDelete = chapters.value[index]
      if (!chapterToDelete) return

      if (removeFromLichess && chapterToDelete.lichessChapterId) {
        const study = studies.value.find(s => s.id === chapterToDelete.studyId)
        if (study && study.lichessId) {
          cloudLoading.value = true
          try {
            await lichessSyncService.deleteChapter(study.lichessId, chapterToDelete.lichessChapterId)
          } catch (error) {
            console.error('Failed to delete chapter on Lichess', error)
            throw error
          } finally {
            cloudLoading.value = false
          }
        }
      }

      // Remove from study if it belongs to one
      let parentStudy: Study | undefined
      if (chapterToDelete?.studyId) {
        parentStudy = studies.value.find(s => s.id === chapterToDelete.studyId)
        if (parentStudy) {
          parentStudy.chapterIds = parentStudy.chapterIds.filter(cid => cid !== id)
          await studyPersistenceService.saveStudy(parentStudy)
        }
      }

      chapters.value.splice(index, 1)
      await studyPersistenceService.deleteChapter(id)

      if (chapters.value.length === 0) {
        activeChapterId.value = null
        return
      }

      // If the active chapter was the one we just deleted, we need to pick a new one
      if (activeChapterId.value === id) {
        let nextChapterId: string | undefined

        // Try to pick another chapter from the same study first
        if (parentStudy && parentStudy.chapterIds.length > 0) {
          nextChapterId = parentStudy.chapterIds[0]
        } 
        // If the study is empty or we didn't have a parent study, fallback to the first available chapter globally
        else if (chapters.value.length > 0 && chapters.value[0]) {
          nextChapterId = chapters.value[0].id
        }

        if (nextChapterId) {
          setActiveChapter(nextChapterId)
        } else {
          activeChapterId.value = null
        }
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
      const pgnData = await lichessSyncService.fetchStudyPgn(studyId)
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
        // Study exists - we must purge old chapters from DB and state
        const oldChapters = chapters.value.filter(c => c.studyId === studyId)
        for (const c of oldChapters) {
          await studyPersistenceService.deleteChapter(c.id)
        }
        
        // Update state
        studies.value[existingStudyIndex] = study
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

        // Extract Lichess Chapter ID from URL: https://lichess.org/study/studyId/chapterId
        let lichessChapterId: string | undefined = undefined
        if (tags['ChapterURL']) {
          const urlParts = tags['ChapterURL'].split('/')
          lichessChapterId = urlParts[urlParts.length - 1]
        }

        // Map Orientation to color
        const color = tags['Orientation'] === 'black' ? 'black' : 'white'

        const newChapter: StudyChapter = {
          id: chapterId,
          name: chapterName,
          root,
          tags,
          savedPath: '',
          color,
          studyId: study.id,
          lichessChapterId,
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

  // --- SYNC ACTIONS ---

  async function publishChapterToLichess(chapterId: string) {
    if (!(await requireLichessAccess())) return

    if (!activeStudy.value || !activeStudy.value.lichessId) {
      throw new Error('This study is not linked to Lichess.')
    }

    const chapter = chapters.value.find(c => c.id === chapterId)
    if (!chapter) {
      throw new Error('Chapter not found.')
    }

    if (chapter.lichessChapterId) {
      throw new Error('Chapter is already linked to Lichess.')
    }

    cloudLoading.value = true
    try {
      const pgn = pgnService.getFullPgn(chapter.tags, chapter.root)
      const newLichessChapterId = await lichessSyncService.importPgnIntoStudy(
        activeStudy.value.lichessId,
        {
          pgn,
          name: chapter.name,
          orientation: chapter.color,
          variant: 'standard'
        }
      )

      chapter.lichessChapterId = newLichessChapterId
      await studyPersistenceService.saveChapter(chapter)
      return newLichessChapterId
    } catch (e) {
      console.error('Failed to publish chapter to Lichess', e)
      throw e
    } finally {
      cloudLoading.value = false
    }
  }

  async function syncLichessToApp(studyId: string) {
    // Just re-import, it will overwrite the study and its chapters
    return await importFromLichess(studyId)
  }

  async function pushChapterToLichess(chapterId: string) {
    if (!(await requireLichessAccess())) return

    if (!activeStudy.value || !activeStudy.value.lichessId) {
      throw new Error('This study is not linked to Lichess.')
    }

    const chapter = chapters.value.find(c => c.id === chapterId)
    if (!chapter) {
      throw new Error('Chapter not found.')
    }

    if (!chapter.lichessChapterId) {
      throw new Error('Chapter is not linked to Lichess.')
    }

    cloudLoading.value = true
    try {
      // Step 1: Delete the existing chapter on Lichess
      await lichessSyncService.deleteChapter(activeStudy.value.lichessId, chapter.lichessChapterId)
      
      // Step 2: Wait 500ms to avoid race conditions or 429s on Lichess side
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 3: Re-create the chapter by importing the full PGN
      const pgn = pgnService.getFullPgn(chapter.tags, chapter.root)
      const newLichessChapterId = await lichessSyncService.importPgnIntoStudy(
        activeStudy.value.lichessId,
        {
          pgn,
          name: chapter.name,
          orientation: chapter.color,
          variant: 'standard'
        }
      )

      // Step 4: Update the local chapter reference
      chapter.lichessChapterId = newLichessChapterId
      await studyPersistenceService.saveChapter(chapter)

    } catch (e) {
      console.error('Failed to push chapter to Lichess', e)
      throw e
    } finally {
      cloudLoading.value = false
    }
  }

  async function publishToLichess(request: Omit<LichessStudyCreateRequest, 'name'>) {
    if (!(await requireLichessAccess())) return

    if (!activeStudy.value) return

    cloudLoading.value = true
    try {
      // 1. Create the study on Lichess
      const lichessId = await lichessSyncService.createStudy({
        name: activeStudy.value.title,
        ...request
      })

      activeStudy.value.lichessId = lichessId
      
      // 2. Link existing chapters or push them? 
      // Lichess creates one empty chapter by default.
      // For now, we just link the study. Pushing chapters can be a second step.
      
      await studyPersistenceService.saveStudy(activeStudy.value)
      return lichessId
    } catch (e) {
      console.error('Failed to publish to Lichess', e)
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
    isAuthModalVisible,
    requireLichessAccess,
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
    syncLichessToApp,
    pushChapterToLichess,
    publishToLichess,
    publishChapterToLichess,
  }
})

