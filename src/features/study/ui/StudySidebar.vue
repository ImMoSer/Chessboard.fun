<script setup lang="ts">
import { AddOutline, CloudDownloadOutline, SettingsOutline } from '@vicons/ionicons5'
import { NButton, NIcon, NList, NListItem, NScrollbar, NSpace, NText, NThing, useDialog, useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { LichessApiError } from '../api/LichessSyncService'
import { useStudyStore, type StudyChapter } from '../model/study.store'
import ChapterSettingsModal from './ChapterSettingsModal.vue'
import LichessErrorModal from './LichessErrorModal.vue'

const studyStore = useStudyStore()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const { t } = useI18n()

const SYNC_COOLDOWN_MS = 60 * 1000 // 60 seconds
const lastSyncTime = ref<number>(0)
const cooldownRemaining = ref(0)
let cooldownTimer: number | null = null

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

const isSpeedrunReady = computed(() => {
  if (activeStudyChapters.value.length === 0) return false
  return activeStudyChapters.value.every(chapter => 
    chapter.chapter_type === 'speedrun' && 
    ['1-0', '0-1', '1/2-1/2'].includes(chapter.tags.Result || '')
  )
})

const showSettingsModal = ref(false)
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

  // Chapter Cooldowns
  // Logic removed (moved to ChapterSettingsModal.vue)

  // Clear interval if no cooldowns are active
  const hasActiveCooldowns = cooldownRemaining.value > 0

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

function handleStartSpeedrun() {
  console.log('[StudySidebar] START_SPEEDRUN clicked for study:', studyStore.activeStudy?.id)
  
  const speedrunChapters = activeStudyChapters.value.filter(chapter => 
    chapter.chapter_type === 'speedrun' && 
    ['1-0', '0-1', '1/2-1/2'].includes(chapter.tags.Result || '')
  )

  if (speedrunChapters.length > 0) {
    router.push({ 
      name: 'study-speedrun', 
      query: { studyId: studyStore.activeStudy?.id } 
    })
  } else {
    message.warning(t('features.speedrun.noValidChapters'))
  }
}

// Handlers moved to ChapterSettingsModal

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

// Handlers moved to ChapterSettingsModal
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
      </div>
      
      <div v-if="isSpeedrunReady" class="speedrun-ready-badge" @click="handleStartSpeedrun">
        SPEEDRUN READY
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
              <NSpace align="center" :size="6" style="flex-wrap: nowrap; overflow: hidden; max-width: 100%;">
                <span class="chapter-name">{{ chapter.name }}</span>
                <span v-if="chapter.chapter_type === 'repertoire'" class="tag-rep">REP</span>
                <template v-else-if="chapter.chapter_type === 'speedrun'">
                  <span 
                    v-if="['1-0', '0-1', '1/2-1/2'].includes(chapter.tags.Result || '')" 
                    class="tag-speed"
                    :class="{
                      'tag-win-white': chapter.tags.Result === '1-0',
                      'tag-win-black': chapter.tags.Result === '0-1',
                      'tag-draw': chapter.tags.Result === '1/2-1/2'
                    }"
                  >
                    {{ chapter.tags.Result }}
                  </span>
                  <span v-else class="tag-result">RESULT</span>
                </template>
              </NSpace>
            </template>
            <template #header-extra>
              <NSpace size="small">
                <NButton 
                  v-if="!isCommunity"
                  size="tiny" quaternary circle @click="(e) => openSettings(chapter, e)"
                >
                  <template #icon><NIcon class="settings-icon"><SettingsOutline /></NIcon></template>
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

.speedrun-ready-badge {
  font-size: 0.7rem;
  font-weight: 900;
  color: white;
  background: var(--neon-bordeaux);
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  align-self: flex-start;
  margin-top: 2px;
  letter-spacing: 1px;
  transition: all 0.2s ease;
  box-shadow: 0 0 10px rgba(217, 0, 76, 0.3);
}

.speedrun-ready-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 15px rgba(217, 0, 76, 0.6);
  filter: brightness(1.1);
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
  min-width: 0;
  flex: 1;
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

.tag-speed {
  font-size: 0.65rem;
  font-weight: 800;
  border-radius: 4px;
  padding: 0 4px;
  flex-shrink: 0;
  border: 1px solid transparent;
}

.tag-win-white {
  color: var(--neon-cyan);
  border-color: var(--neon-cyan);
}

.tag-win-black {
  color: var(--neon-purple);
  border-color: var(--neon-purple);
}

.tag-draw {
  color: var(--neon-yellow);
  border-color: var(--neon-yellow);
}

.tag-result {
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
