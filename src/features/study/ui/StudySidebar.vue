<script setup lang="ts">
import { useStudyStore, type StudyChapter } from '../model/study.store'
import { NList, NListItem, NThing, NText, NScrollbar, NButton, NIcon, NSpace, useMessage, useDialog } from 'naive-ui'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { AddOutline, SettingsOutline, TrashOutline, CloudUploadOutline, CloudDownloadOutline, ArrowUpOutline } from '@vicons/ionicons5'
import { LichessApiError } from '../api/LichessSyncService'
import ChapterSettingsModal from './ChapterSettingsModal.vue'
import PublishStudyModal from './PublishStudyModal.vue'
import LichessErrorModal from './LichessErrorModal.vue'

const studyStore = useStudyStore()
const message = useMessage()
const dialog = useDialog()

const SYNC_COOLDOWN_MS = 300 * 1000 // 300 seconds
const PUSH_COOLDOWN_MS = 60 * 1000
const PUBLISH_CHAPTER_COOLDOWN_MS = 15 * 1000
const DELETE_COOLDOWN_MS = 5 * 1000
const PUBLISH_STUDY_COOLDOWN_MS = 60 * 1000

const lastSyncTime = ref<number>(0)
const cooldownRemaining = ref(0)
let cooldownTimer: number | null = null

const chapterPushCooldowns = ref<Record<string, number>>({})
const chapterPublishCooldowns = ref<Record<string, number>>({})
const chapterDeleteCooldowns = ref<Record<string, number>>({})
const publishStudyCooldownRemaining = ref(0)

const activeStudyChapters = computed(() => {
  if (!studyStore.activeStudy) return []
  return studyStore.chapters.filter(c => c.studyId === studyStore.activeStudy?.id)
})

const cooldownActive = computed(() => cooldownRemaining.value > 0)

const showSettingsModal = ref(false)
const showPublishModal = ref(false)
const showErrorModal = ref(false)
const errorStatus = ref<number | undefined>(undefined)
const errorMessage = ref('')
const isCreating = ref(false)
const selectedChapter = ref<StudyChapter | null>(null)

function updateCooldown() {
  const now = Date.now()
  
  // Sync Study Cooldown
  const elapsedSync = now - lastSyncTime.value
  cooldownRemaining.value = Math.max(0, Math.ceil((SYNC_COOLDOWN_MS - elapsedSync) / 1000))
  
  // Publish Study Cooldown
  const lastPubStudy = parseInt(localStorage.getItem('publish_study_time') || '0', 10)
  publishStudyCooldownRemaining.value = Math.max(0, Math.ceil((PUBLISH_STUDY_COOLDOWN_MS - (now - lastPubStudy)) / 1000))

  // Chapter Cooldowns
  for (const c of studyStore.chapters) {
    const pushLast = parseInt(localStorage.getItem(`push_${c.id}`) || '0', 10)
    const pushRem = Math.ceil((PUSH_COOLDOWN_MS - (now - pushLast)) / 1000)
    if (pushRem > 0) chapterPushCooldowns.value[c.id] = pushRem
    else delete chapterPushCooldowns.value[c.id]

    const pubLast = parseInt(localStorage.getItem(`pub_${c.id}`) || '0', 10)
    const pubRem = Math.ceil((PUBLISH_CHAPTER_COOLDOWN_MS - (now - pubLast)) / 1000)
    if (pubRem > 0) chapterPublishCooldowns.value[c.id] = pubRem
    else delete chapterPublishCooldowns.value[c.id]

    const delLast = parseInt(localStorage.getItem(`del_${c.id}`) || '0', 10)
    const delRem = Math.ceil((DELETE_COOLDOWN_MS - (now - delLast)) / 1000)
    if (delRem > 0) chapterDeleteCooldowns.value[c.id] = delRem
    else delete chapterDeleteCooldowns.value[c.id]
  }

  // Clear interval if no cooldowns are active
  const hasActiveCooldowns = cooldownRemaining.value > 0 || 
                             publishStudyCooldownRemaining.value > 0 ||
                             Object.keys(chapterPushCooldowns.value).length > 0 ||
                             Object.keys(chapterPublishCooldowns.value).length > 0 ||
                             Object.keys(chapterDeleteCooldowns.value).length > 0
                             
  if (!hasActiveCooldowns && cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
}

function startTimerIfNeeded() {
  updateCooldown()
  if (!cooldownTimer) {
    cooldownTimer = window.setInterval(updateCooldown, 1000)
  }
}

onMounted(() => {
  const stored = localStorage.getItem(`lastSync_${studyStore.activeStudy?.id}`)
  if (stored) {
    lastSyncTime.value = parseInt(stored, 10)
  }
  startTimerIfNeeded()
})

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})

function selectChapter(id: string) {
  studyStore.setActiveChapter(id)
}

function handleAddChapter() {
  if (studyStore.activeStudy && studyStore.activeStudy.chapterIds.length < 64) {
    selectedChapter.value = null
    isCreating.value = true
    showSettingsModal.value = true
  }
}

function openSettings(chapter: StudyChapter, e: Event) {
  e.stopPropagation()
  selectedChapter.value = chapter
  isCreating.value = false
  showSettingsModal.value = true
}

async function handleDeleteChapter(chapter: StudyChapter, e: Event) {
  e.stopPropagation()
  if (activeStudyChapters.value.length <= 1) {
    return // Keep at least one chapter
  }

  if (chapterDeleteCooldowns.value[chapter.id]) {
    message.warning(`Please wait ${chapterDeleteCooldowns.value[chapter.id]}s before deleting again.`)
    return
  }

  if (studyStore.activeStudy?.lichessId && chapter.lichessChapterId) {
    dialog.warning({
      title: 'Delete Published Chapter',
      content: 'This chapter is published on Lichess. Deleting it will permanently remove it from both your local device and Lichess. Are you sure you want to proceed?',
      positiveText: 'Yes, Delete',
      negativeText: 'Cancel',
      onPositiveClick: async () => {
        try {
          message.loading('Deleting chapter...')
          await studyStore.deleteChapter(chapter.id, true)
          localStorage.setItem(`del_${chapter.id}`, Date.now().toString())
          startTimerIfNeeded()
          message.success('Chapter deleted locally and on Lichess')
        } catch (error: unknown) {
          if (error instanceof LichessApiError) {
            errorStatus.value = error.status
            errorMessage.value = error.message
            showErrorModal.value = true
          } else {
            message.error('Failed to delete chapter on Lichess')
          }
        }
      }
    })
  } else {
    await studyStore.deleteChapter(chapter.id)
  }
}

async function handlePublishChapter(chapter: StudyChapter, e: Event) {
  e.stopPropagation()

  if (chapterPublishCooldowns.value[chapter.id]) {
    message.warning(`Please wait ${chapterPublishCooldowns.value[chapter.id]}s before publishing again.`)
    return
  }

  try {
    message.loading('Publishing chapter to Lichess...')
    await studyStore.publishChapterToLichess(chapter.id)
    localStorage.setItem(`pub_${chapter.id}`, Date.now().toString())
    startTimerIfNeeded()
    message.success('Chapter published successfully')
  } catch (e: unknown) {
    if (e instanceof LichessApiError) {
      errorStatus.value = e.status
      errorMessage.value = e.message
      showErrorModal.value = true
    } else {
      const error = e instanceof Error ? e.message : 'Publish failed'
      message.error(error)
    }
  }
}

async function handleSyncFromLichess() {
  if (!studyStore.activeStudy?.lichessId) return

  if (cooldownActive.value) {
    message.warning(`Please wait ${cooldownRemaining.value}s before syncing again.`)
    return
  }

  dialog.warning({
    title: 'Confirm Sync from Lichess',
    content: 'All local changes for this study that haven\'t been pushed to Lichess will be permanently lost. The local data will be completely replaced with the current state from Lichess. Do you want to proceed?',
    positiveText: 'Yes, Sync',
    negativeText: 'Cancel',
    onPositiveClick: async () => {
      try {
        message.loading('Syncing from Lichess...')
        await studyStore.syncLichessToApp(studyStore.activeStudy!.lichessId!)
        
        // Set cooldown
        lastSyncTime.value = Date.now()
        localStorage.setItem(`lastSync_${studyStore.activeStudy?.id}`, lastSyncTime.value.toString())
        startTimerIfNeeded()
        
        message.success('Study updated from Lichess')
      } catch (e: unknown) {
        if (e instanceof LichessApiError) {
          errorStatus.value = e.status
          errorMessage.value = e.message
          showErrorModal.value = true
        } else {
          const error = e instanceof Error ? e.message : 'Sync failed'
          message.error(error)
        }
      }
    }
  })
}

async function handlePushChapterToLichess(chapter: StudyChapter, e: Event) {
  e.stopPropagation()

  if (chapterPushCooldowns.value[chapter.id]) {
    message.warning(`Please wait ${chapterPushCooldowns.value[chapter.id]}s before pushing again.`)
    return
  }

  try {
    message.loading('Pushing chapter changes to Lichess...')
    await studyStore.pushChapterToLichess(chapter.id)
    localStorage.setItem(`push_${chapter.id}`, Date.now().toString())
    startTimerIfNeeded()
    message.success('Chapter updated successfully on Lichess')
  } catch (e: unknown) {
    if (e instanceof LichessApiError) {
      errorStatus.value = e.status
      errorMessage.value = e.message
      showErrorModal.value = true
    } else {
      const error = e instanceof Error ? e.message : 'Push failed'
      message.error(error)
    }
  }
}
</script>

<template>
  <div v-if="studyStore.activeStudy" class="study-sidebar">
    <div class="study-sidebar-header">
      <div class="header-main-row">
        <NText strong class="study-title">{{ studyStore.activeStudy.title }}</NText>
        
        <NSpace v-if="studyStore.activeStudy.lichessId" size="small">
          <NButton 
            size="tiny" 
            quaternary 
            circle 
            @click="handleSyncFromLichess" 
            :disabled="cooldownActive"
            :title="cooldownActive ? `Cooldown: ${cooldownRemaining}s` : 'Sync from Lichess'"
          >
            <template #icon><NIcon><CloudDownloadOutline /></NIcon></template>
          </NButton>
        </NSpace>
        <NButton 
          v-else 
          size="tiny" 
          secondary 
          :disabled="publishStudyCooldownRemaining > 0"
          :title="publishStudyCooldownRemaining > 0 ? `Wait ${publishStudyCooldownRemaining}s` : 'Publish to Lichess'"
          @click="showPublishModal = true"
        >
          Publish
        </NButton>
      </div>
      <div class="chapter-count-badge">{{ activeStudyChapters.length }} / 64 Chapters</div>
    </div>
    
    <NScrollbar class="chapters-scroll">
      <NList hoverable clickable>
        <NListItem
          v-for="(chapter, index) in activeStudyChapters"
          :key="chapter.id"
          :class="{ active: studyStore.activeChapterId === chapter.id }"
          @click="selectChapter(chapter.id)"
        >
          <NThing>
            <template #avatar>
              <div class="chapter-index">{{ index + 1 }}</div>
            </template>
            <template #header>
              <span class="chapter-name">{{ chapter.name }}</span>
            </template>
            <template #header-extra>
              <NSpace size="small">
                <NButton 
                  v-if="studyStore.activeStudy?.lichessId && !chapter.lichessChapterId"
                  size="tiny" 
                  quaternary 
                  circle 
                  type="primary"
                  :disabled="!!chapterPublishCooldowns[chapter.id]"
                  :title="chapterPublishCooldowns[chapter.id] ? `Wait ${chapterPublishCooldowns[chapter.id]}s` : 'Publish chapter to Lichess'"
                  @click="(e) => handlePublishChapter(chapter, e)"
                >
                  <template #icon><NIcon><ArrowUpOutline /></NIcon></template>
                </NButton>
                <NButton 
                  v-if="studyStore.activeStudy?.lichessId && chapter.lichessChapterId"
                  size="tiny" 
                  quaternary 
                  circle 
                  :disabled="!!chapterPushCooldowns[chapter.id]"
                  :title="chapterPushCooldowns[chapter.id] ? `Wait ${chapterPushCooldowns[chapter.id]}s` : 'Push chapter updates to Lichess'"
                  @click="(e) => handlePushChapterToLichess(chapter, e)"
                >
                  <template #icon><NIcon><CloudUploadOutline /></NIcon></template>
                </NButton>
                <NButton size="tiny" quaternary circle @click="(e) => openSettings(chapter, e)">
                  <template #icon><NIcon><SettingsOutline /></NIcon></template>
                </NButton>
                <NButton 
                  v-if="activeStudyChapters.length > 1"
                  size="tiny" 
                  quaternary 
                  circle 
                  type="error" 
                  :disabled="!!chapterDeleteCooldowns[chapter.id]"
                  :title="chapterDeleteCooldowns[chapter.id] ? `Wait ${chapterDeleteCooldowns[chapter.id]}s` : 'Delete chapter'"
                  @click="(e) => handleDeleteChapter(chapter, e)"
                >
                  <template #icon><NIcon><TrashOutline /></NIcon></template>
                </NButton>
              </NSpace>
            </template>
          </NThing>
        </NListItem>
      </NList>

      <div class="sidebar-actions">
        <NButton 
          block 
          dashed 
          size="medium" 
          :disabled="activeStudyChapters.length >= 64"
          @click="handleAddChapter"
        >
          <template #icon>
            <NIcon><AddOutline /></NIcon>
          </template>
          Add Chapter
        </NButton>
      </div>
    </NScrollbar>

    <ChapterSettingsModal
      v-model:show="showSettingsModal"
      :chapter="selectedChapter"
      :is-creating="isCreating"
    />

    <PublishStudyModal v-model:show="showPublishModal" />

    <LichessErrorModal
      v-model:show="showErrorModal"
      :status="errorStatus"
      :message="errorMessage"
    />
  </div>
</template>

<style scoped>
.study-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  overflow: hidden;
}

.study-sidebar-header {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-main-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.study-title {
  font-size: 1.1rem;
  color: var(--color-accent-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chapter-count-badge {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.chapters-scroll {
  flex: 1;
}

.chapter-index {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.chapter-name {
  font-size: 0.9rem;
  font-weight: 500;
}

.active {
  background-color: rgba(var(--color-primary-rgb), 0.15) !important;
  border-left: 3px solid var(--color-accent-primary);
}

.active .chapter-index {
  background: var(--color-accent-primary);
  color: white;
}

.sidebar-actions {
  padding: 16px;
}

:deep(.n-list-item) {
  padding: 10px 16px !important;
  transition: all 0.2s ease;
}

:deep(.n-list-item:hover) {
  background: rgba(255, 255, 255, 0.05);
}
</style>
