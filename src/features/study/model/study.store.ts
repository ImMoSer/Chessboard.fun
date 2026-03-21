import { useBoardStore } from '@/entities/game'
import { useAuthStore } from '@/entities/user'
import { chapterApiService } from '../api/ChapterApiService'
import { studyPersistenceService } from '../api/StudyPersistenceService'
import { pgnParserService } from '@/shared/lib/pgn/PgnParserService'
import { pgnService, pgnTreeVersion, type PgnNode } from '@/shared/lib/pgn/PgnService'
import { makeFen, parseFen } from 'chessops/fen'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export interface StudyChapter {
  id: string
  name: string
  root: PgnNode // The reference to the tree
  tags: Record<string, string>
  savedPath: string // To restore cursor location
  color?: 'white' | 'black'
  slug?: string // Cloud ID
  ownerId?: string // Cloud Owner ID
  isStandard?: boolean // Whether it's the standard white/black repertoire
  isPublic?: boolean // Whether it's public in the cloud
}

export const useStudyStore = defineStore('study', () => {
  const boardStore = useBoardStore()
  const authStore = useAuthStore()

  const chapters = ref<StudyChapter[]>([])
  const activeChapterId = ref<string | null>(null)
  const isInitialized = ref(false)
  const cloudLoading = ref(false)

  const activeChapter = computed(() => chapters.value.find((c) => c.id === activeChapterId.value))

  const isOwner = computed(() => {
    if (!activeChapter.value || !authStore.userProfile) return true
    if (!activeChapter.value.slug) return true
    return activeChapter.value.ownerId === authStore.userProfile.id
  })

  function generateId(): string {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
  }

  function createStandardChapter(color: 'white' | 'black') {
    const lichessId = authStore.userProfile?.id || 'Player'
    const name = `${lichessId}_${color}`
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    
    let normalizedFen = startFen
    try {
      const setup = parseFen(startFen).unwrap()
      normalizedFen = makeFen(setup)
    } catch {
      // ignore
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

    const id = `standard-${color}`
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
      isStandard: true,
      ownerId: authStore.userProfile?.id
    }

    chapters.value.push(newChapter)
    studyPersistenceService.saveChapter(newChapter)
  }

  async function initialize() {
    if (isInitialized.value) return

    const loadedChapters = await studyPersistenceService.getAllChapters()
    if (loadedChapters.length > 0) {
      chapters.value = loadedChapters
    }

    // Ensure standard chapters exist
    const hasStandardWhite = chapters.value.some(c => c.isStandard && c.color === 'white')
    const hasStandardBlack = chapters.value.some(c => c.isStandard && c.color === 'black')
    
    if (!hasStandardWhite) {
      createStandardChapter('white')
    }
    if (!hasStandardBlack) {
      createStandardChapter('black')
    }

    // Sync with cloud if authenticated
    if (authStore.isAuthenticated) {
      try {
        const cloudChapters = await chapterApiService.getMyChapters()
        for (const cc of cloudChapters) {
          // Identify local standard chapters that might match this cloud chapter
          const localMatch = chapters.value.find((c) => c.slug === cc.slug || (c.isStandard && c.color === cc.color))
          if (localMatch) {
            localMatch.slug = cc.slug
            localMatch.ownerId = cc.ownerId
            localMatch.isPublic = cc.isPublic // Assume we add isPublic to interface later or use it in component
            studyPersistenceService.saveChapter(localMatch)
          } else {
            // Import new cloud chapter locally (fallback)
            await loadFromCloud(cc.slug)
          }
        }
      } catch (e) {
        console.error('Failed to sync cloud chapters', e)
      }
    }

    // No need to create default chapter since we now always have the standard ones
    // if (chapters.value.length === 0) { ... }

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
    }

    chapters.value.push(newChapter)

    // Save immediately
    studyPersistenceService.saveChapter(newChapter)

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

      if (chapterToDelete?.isStandard) {
        throw new Error('Standard repertoires cannot be deleted.')
      }

      // If it's a cloud chapter, try to delete from server first
      if (chapterToDelete?.slug && chapterToDelete.ownerId === authStore.userProfile?.id) {
        try {
          await chapterApiService.deleteChapter(chapterToDelete.slug)
        } catch (e) {
          console.error('Failed to delete chapter from cloud:', e)
          // We continue local deletion even if cloud fails, to keep UI responsive
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

  // --- CLOUD ACTIONS ---

  async function saveToCloud() {
    if (!activeChapter.value || cloudLoading.value) return
    if (!activeChapter.value.isStandard) {
      throw new Error('Only standard repertoires can be saved to the cloud.')
    }
    cloudLoading.value = true
    try {
      const pgn = pgnService.getFullPgn(activeChapter.value.tags)
      const result = await chapterApiService.createChapter({
        title: activeChapter.value.name,
        color: activeChapter.value.color || 'white',
        pgn: pgn,
        isPublic: activeChapter.value.isPublic !== false // default true if not set
      })
      activeChapter.value.slug = result.slug
      activeChapter.value.ownerId = result.ownerId
      activeChapter.value.isPublic = result.isPublic
      await studyPersistenceService.saveChapter(activeChapter.value)
      return result.slug
    } catch (e) {
      console.error('Failed to save to cloud', e)
      throw e
    } finally {
      cloudLoading.value = false
    }
  }

  async function updateInCloud() {
    if (!activeChapter.value || !activeChapter.value.slug || cloudLoading.value) return
    cloudLoading.value = true
    try {
      const pgn = pgnService.getFullPgn(activeChapter.value.tags)
      await chapterApiService.updateChapter(activeChapter.value.slug, {
        title: activeChapter.value.name,
        color: activeChapter.value.color,
        pgn: pgn,
        isPublic: activeChapter.value.isPublic
      })
    } catch (e) {
      console.error('Failed to update in cloud', e)
      throw e
    } finally {
      cloudLoading.value = false
    }
  }

  async function forkToCloud() {
    throw new Error('Custom repertoires can only be saved locally.')
  }

  async function togglePublicStatus(isPublic: boolean) {
    if (!activeChapter.value || !activeChapter.value.slug) return
    activeChapter.value.isPublic = isPublic
    await updateInCloud()
  }

  async function syncFromCloud(slug: string) {
    cloudLoading.value = true
    try {
      const cloudChap = await chapterApiService.getChapter(slug)
      const local = chapters.value.find((c) => c.slug === slug)
      
      const { tags, root } = pgnParserService.parse(cloudChap.pgn)

      if (local) {
        local.root = root
        local.tags = tags
        local.name = cloudChap.title
        local.color = cloudChap.color
        local.isPublic = cloudChap.isPublic
        await studyPersistenceService.saveChapter(local)
        
        if (activeChapterId.value === local.id) {
          pgnService.setRoot(local.root, local.savedPath)
          boardStore.syncBoardWithPgn()
        }
      }
    } catch (e) {
      console.error('Failed to sync from cloud', e)
      throw e
    } finally {
      cloudLoading.value = false
    }
  }

  async function loadFromCloud(slug: string) {
    cloudLoading.value = true
    try {
      const existing = chapters.value.find((c) => c.slug === slug)
      if (existing) {
        setActiveChapter(existing.id)
        return existing.id
      }

      const cloudChap = await chapterApiService.getChapter(slug)
      // Use slug as title if it's a standard repertoire
      const displayTitle = (cloudChap.title === 'White Repertoire' || cloudChap.title === 'Black Repertoire')
        ? cloudChap.slug
        : cloudChap.title

      const id = createChapterFromPgn(cloudChap.pgn, displayTitle, cloudChap.color)
      const newChap = chapters.value.find((c) => c.id === id)
      if (newChap) {
        newChap.slug = cloudChap.slug
        newChap.ownerId = cloudChap.ownerId
        newChap.isPublic = cloudChap.isPublic
        await studyPersistenceService.saveChapter(newChap)
      }
      return id
    } catch (e) {
      console.error('Failed to load from cloud', e)
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
    saveToCloud,
    updateInCloud,
    forkToCloud,
    loadFromCloud,
    togglePublicStatus,
    syncFromCloud,
  }
})
