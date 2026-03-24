<script setup lang="ts">
import { useStudyStore, type StudyChapter } from '../model/study.store'
import { NList, NListItem, NThing, NText, NScrollbar, NButton, NIcon, NSpace, useMessage, useDialog } from 'naive-ui'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { AddOutline, SettingsOutline, TrashOutline, CloudUploadOutline, CloudDownloadOutline, ArrowUpOutline } from '@vicons/ionicons5'
import { LichessApiError } from '../api/LichessSyncService'
import ChapterSettingsModal from './ChapterSettingsModal.vue'
import LichessErrorModal from './LichessErrorModal.vue'

const studyStore = useStudyStore()
const message = useMessage()
const dialog = useDialog()
const { t } = useI18n()

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
  const study = studyStore.activeStudy
  if (!study) return []
  
  const chapters = studyStore.chapters.filter(c => c.studyId === study.id)
  const orderMap = new Map(study.chapterIds.map((id, index) => [id, index]))
  
  return chapters.sort((a, b) => {
    const aIndex = orderMap.get(a.id) ?? 9999
    const bIndex = orderMap.get(b.id) ?? 9999
    return aIndex - bIndex
  })
})

const isCommunity = computed(() => studyStore.activeStudy?.type === 'community')
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
      title: t('features.study.sidebar.deleteChapterTitle'),
      content: t('features.study.sidebar.deleteChapterContent'),
      positiveText: t('features.study.sidebar.deleteChapterConfirm'),
      negativeText: t('features.study.sidebar.deleteChapterCancel'),
      onPositiveClick: async () => {
        try {
          message.loading(t('features.study.sidebar.deletingChapter'))
          await studyStore.deleteChapter(chapter.id, true)
          localStorage.setItem(`del_${chapter.id}`, Date.now().toString())
          startTimerIfNeeded()
          message.success(t('features.study.sidebar.deleteSuccess'))
        } catch (error: unknown) {
          if (error instanceof LichessApiError) {
            errorStatus.value = error.status
            errorMessage.value = error.message
            showErrorModal.value = true
          } else {
            message.error(t('features.study.sidebar.deleteError'))
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
    message.loading(t('features.study.sidebar.publishingChapter'))
    await studyStore.publishChapterToLichess(chapter.id)
    localStorage.setItem(`pub_${chapter.id}`, Date.now().toString())
    startTimerIfNeeded()
    message.success(t('features.study.sidebar.publishSuccess'))
  } catch (e: unknown) {
    if (e instanceof LichessApiError) {
      errorStatus.value = e.status
      errorMessage.value = e.message
      showErrorModal.value = true
    } else {
      const error = e instanceof Error ? e.message : t('features.study.sidebar.publishError')
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
    title: t('features.study.sidebar.syncConfirmTitle'),
    content: t('features.study.sidebar.syncConfirmContent'),
    positiveText: t('features.study.sidebar.syncConfirmPositive'),
    negativeText: t('features.study.sidebar.syncConfirmNegative'),
    onPositiveClick: async () => {
      try {
        message.loading(t('features.study.sidebar.syncing'))
        await studyStore.syncLichessToApp(studyStore.activeStudy!.lichessId!)
        
        // Set cooldown
        lastSyncTime.value = Date.now()
        localStorage.setItem(`lastSync_${studyStore.activeStudy?.id}`, lastSyncTime.value.toString())
        startTimerIfNeeded()
        
        message.success(t('features.study.sidebar.syncSuccess'))
      } catch (e: unknown) {
        if (e instanceof LichessApiError) {
          errorStatus.value = e.status
          errorMessage.value = e.message
          showErrorModal.value = true
        } else {
          const error = e instanceof Error ? e.message : t('features.study.sidebar.syncError')
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
    message.loading(t('features.study.sidebar.pushing'))
    await studyStore.pushChapterToLichess(chapter.id)
    localStorage.setItem(`push_${chapter.id}`, Date.now().toString())
    startTimerIfNeeded()
    message.success(t('features.study.sidebar.pushSuccess'))
  } catch (e: unknown) {
    if (e instanceof LichessApiError) {
      errorStatus.value = e.status
      errorMessage.value = e.message
      showErrorModal.value = true
    } else {
      const error = e instanceof Error ? e.message : t('features.study.sidebar.pushError')
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
            :title="cooldownActive ? t('features.study.sidebar.cooldownTooltip', { seconds: cooldownRemaining }) : t('features.study.sidebar.syncTooltip')"
          >
            <template #icon><NIcon class="sync-icon"><CloudDownloadOutline /></NIcon></template>
          </NButton>
        </NSpace>
        <NButton 
          v-else 
          size="tiny" 
          secondary 
          :disabled="publishStudyCooldownRemaining > 0"
          :title="publishStudyCooldownRemaining > 0 ? t('features.study.sidebar.cooldownWait', { seconds: publishStudyCooldownRemaining }) : t('features.study.sidebar.publishStudyTooltip')"
          @click="showPublishModal = true"
        >
          {{ t('features.study.sidebar.publishButton') }}
        </NButton>
      </div>
      <div class="chapter-count-badge">{{ t('features.study.sidebar.chapterCount', { count: activeStudyChapters.length }) }}</div>
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
              <NSpace align="center" :size="6" style="flex-wrap: nowrap">
                <span class="chapter-name">{{ chapter.name }}</span>
                <span v-if="chapter.chapter_type === 'repertoire'" class="tag-rep">REP</span>
                <span v-if="chapter.chapter_type === 'speedrun'" class="tag-fen">FEN</span>
              </NSpace>
            </template>
            <template #header-extra>
              <NSpace size="small">
                <NButton 
                  v-if="studyStore.activeStudy?.lichessId && !chapter.lichessChapterId && !isCommunity"
                  size="tiny" 
                  quaternary 
                  circle 
                  type="primary"
                  :disabled="!!chapterPublishCooldowns[chapter.id]"
                  :title="chapterPublishCooldowns[chapter.id] ? t('features.study.sidebar.cooldownWait', { seconds: chapterPublishCooldowns[chapter.id] }) : t('features.study.sidebar.publishChapterTooltip')"
                  @click="(e) => handlePublishChapter(chapter, e)"
                >
                  <template #icon><NIcon><ArrowUpOutline /></NIcon></template>
                </NButton>
                <NButton 
                  v-if="studyStore.activeStudy?.lichessId && chapter.lichessChapterId && !isCommunity"
                  size="tiny" 
                  quaternary 
                  circle 
                  :disabled="!!chapterPushCooldowns[chapter.id]"
                  :title="chapterPushCooldowns[chapter.id] ? t('features.study.sidebar.cooldownWait', { seconds: chapterPushCooldowns[chapter.id] }) : t('features.study.sidebar.pushChapterTooltip')"
                  @click="(e) => handlePushChapterToLichess(chapter, e)"
                >
                  <template #icon><NIcon class="sync-icon"><CloudUploadOutline /></NIcon></template>
                </NButton>
                <NButton 
                  v-if="!isCommunity"
                  size="tiny" quaternary circle @click="(e) => openSettings(chapter, e)"
                >
                  <template #icon><NIcon class="settings-icon"><SettingsOutline /></NIcon></template>
                </NButton>
                <NButton 
                  v-if="activeStudyChapters.length > 1 && !isCommunity"
                  size="tiny" 
                  quaternary 
                  circle 
                  type="error" 
                  :disabled="!!chapterDeleteCooldowns[chapter.id]"
                  :title="chapterDeleteCooldowns[chapter.id] ? t('features.study.sidebar.cooldownWait', { seconds: chapterDeleteCooldowns[chapter.id] }) : t('features.study.sidebar.deleteChapterTooltip')"
                  @click="(e) => handleDeleteChapter(chapter, e)"
                >
                  <template #icon><NIcon><TrashOutline /></NIcon></template>
                </NButton>
              </NSpace>
            </template>
          </NThing>
        </NListItem>
      </NList>

      <div class="sidebar-actions" v-if="!isCommunity">
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
          {{ t('features.study.sidebar.addChapter') }}
        </NButton>
      </div>
    </NScrollbar>

    <ChapterSettingsModal
      v-model:show="showSettingsModal"
      :chapter="selectedChapter"
      :is-creating="isCreating"
    />

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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-rep {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--neon-blue);
  border: 1px solid var(--neon-blue);
  border-radius: 4px;
  padding: 0 4px;
  flex-shrink: 0;
}

.tag-fen {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--neon-red);
  border: 1px solid var(--neon-red);
  border-radius: 4px;
  padding: 0 4px;
  flex-shrink: 0;
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
.sync-icon {
  color: var(--color-primary-hover);
}
.settings-icon {
  color: var(--neon-yellow);
}
</style>
