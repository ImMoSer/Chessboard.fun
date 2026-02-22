```
<script setup lang="ts">
import { useBoardStore } from '@/entities/board'
import { useAuthStore } from '@/entities/user'
import { useAnalysisStore } from '@/features/analysis/model/analysis.store'
import EngineLines from '@/features/analysis/ui/EngineLines.vue'
import MozerBook from '@/features/mozer-book/ui/MozerBook.vue'
import LichessOpeningExplorer from '@/features/opening-explorer/ui/LichessOpeningExplorer.vue'
import { useStudyStore } from '@/features/study/model/study.store'
import RepertoireGeneratorModal from '@/features/study/ui/RepertoireGeneratorModal.vue'
import StudyControls from '@/features/study/ui/StudyControls.vue'
import StudyManagerModal from '@/features/study/ui/StudyManagerModal.vue'
import StudyTree from '@/features/study/ui/StudyTree.vue'
import { pgnService } from '@/shared/lib/pgn/PgnService'
import { useUiStore } from '@/shared/ui/model/ui.store'
import GameLayout from '@/widgets/game-layout/GameLayout.vue'
import { CloudOutline, FlashOutline, ShareSocialOutline } from '@vicons/ionicons5'
import { NIcon, NTooltip, useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const boardStore = useBoardStore()
const studyStore = useStudyStore()
const analysisStore = useAnalysisStore()
const authStore = useAuthStore()
const uiStore = useUiStore()
const message = useMessage()
const { t } = useI18n()

const explorerMode = ref<'lichess' | 'mozer'>('mozer')
const isChapterModalOpen = ref(false)
const isGeneratorModalOpen = ref(false)

const currentChapterName = computed(() => {
  const chapter = studyStore.chapters.find((c) => c.id === studyStore.activeChapterId)
  return chapter ? chapter.name : 'Select Chapter'
})

const handleCloudSave = async () => {
  try {
    if (studyStore.activeChapter?.slug) {
      if (studyStore.isOwner) {
        await studyStore.updateInCloud()
        message.success(t('study.notifications.updated'))
      } else {
        await studyStore.forkToCloud()
        message.success(t('study.notifications.savedAsCopy'))
      }
    } else {
      await studyStore.saveToCloud()
      message.success(t('study.notifications.saved'))
    }
  } catch (e: unknown) {
    const err = e instanceof Error ? e : { message: String(e) }
    if (err.message?.includes('limit reached')) {
      const tier = authStore.userProfile?.subscriptionTier || 'Pawn'
      const limit = tier === 'Queen' || tier === 'King' ? 10 : 1

      const result = await uiStore.showConfirmation(
        t('study.limitModal.title'),
        t('study.limitModal.message', { tier, limit }),
        {
          confirmText: t('study.limitModal.confirm'),
          cancelText: t('study.limitModal.cancel'),
          showCancel: true,
        },
      )

      if (result === 'confirm') {
        router.push('/pricing')
      }
    } else if (err.message?.includes('shorter than or equal to')) {
      await uiStore.showConfirmation(t('study.sizeModal.title'), t('study.sizeModal.message'), {
        confirmText: t('study.sizeModal.confirm'),
        showCancel: false,
      })
    } else {
      message.error(err.message || t('study.notifications.saveError'))
    }
  }
}

const handleShare = () => {
  if (!studyStore.activeChapter?.slug) return
  const url = `${window.location.origin}/study/chapter/${studyStore.activeChapter.slug}`
  navigator.clipboard.writeText(url)
  message.success(t('study.notifications.shareLinkCopied'))
}

onMounted(async () => {
  boardStore.setAnalysisMode(true)
  await analysisStore.showPanel() // Initialize analysis (threads, etc.) and set visible flag for watcher
  await studyStore.initialize()

  if (route.params.slug) {
    await studyStore.loadFromCloud(route.params.slug as string)
  } else if (route.params.id) {
    studyStore.setActiveChapter(route.params.id as string)
  } else if (studyStore.activeChapterId) {
    // Redirect to active chapter URL if we just hit /study
    updateUrl(studyStore.activeChapterId)
  }
})

function updateUrl(id: string) {
  const chapter = studyStore.chapters.find((c) => c.id === id)
  if (!chapter) return

  if (chapter.slug) {
    router.replace({ name: 'study-chapter', params: { slug: chapter.slug } })
  } else {
    router.replace({ name: 'study-local', params: { id: chapter.id } })
  }
}

// Watch for active chapter changes to update URL
watch(
  () => studyStore.activeChapterId,
  (newId) => {
    if (newId) updateUrl(newId)
  },
)

onUnmounted(() => {
  boardStore.setAnalysisMode(false)
  analysisStore.resetAnalysisState()
})

// Auto-update node evaluation from engine
watch(
  () => analysisStore.analysisLines,
  (lines) => {
    if (analysisStore.isAnalysisActive && lines.length > 0) {
      const topMove = lines[0]
      const currentNode = pgnService.getCurrentNode()
      if (topMove && currentNode && currentNode.id !== '__ROOT__') {
        // Convert score to centipawns or mate value
        let scoreVal = topMove.score.value
        if (topMove.score.type === 'mate') {
          scoreVal =
            topMove.score.value > 0 ? 100000 + topMove.score.value : -100000 - topMove.score.value
        }
        pgnService.updateNode(currentNode, { eval: scoreVal })
      }
    }
  },
  { deep: true },
)
</script>

<template>
  <GameLayout>
    <template #top-info>
      <div class="study-header">
        <button class="chapter-select-btn" @click="isChapterModalOpen = true">
          <span class="chapter-title">{{ currentChapterName }}</span>
          <span class="chapter-count">
            ({{
              Math.max(
                0,
                studyStore.chapters.findIndex((c) => c.id === studyStore.activeChapterId) + 1,
              )
            }}/{{ studyStore.chapters.length }})
          </span>
          <span class="dropdown-icon">▼</span>
        </button>

        <div class="header-actions">
          <NTooltip trigger="hover">
            <template #trigger>
              <button class="icon-btn" @click="isGeneratorModalOpen = true">
                <NIcon><FlashOutline /></NIcon>
              </button>
            </template>
            Generate Repertoire
          </NTooltip>

          <NTooltip trigger="hover">
            <template #trigger>
              <button
                class="icon-btn cloud-btn"
                :class="{ active: studyStore.isOwner && studyStore.activeChapter?.slug }"
                :disabled="studyStore.cloudLoading"
                @click="handleCloudSave"
              >
                <NIcon v-if="!studyStore.cloudLoading"><CloudOutline /></NIcon>
                <span v-else class="loader-v2"></span>
              </button>
            </template>
            {{
              !studyStore.activeChapter?.slug
                ? 'Save to Cloud'
                : studyStore.isOwner
                  ? 'Update in Cloud'
                  : 'Save as My Copy'
            }}
          </NTooltip>

          <NTooltip v-if="studyStore.activeChapter?.slug" trigger="hover">
            <template #trigger>
              <button class="icon-btn" @click="handleShare">
                <NIcon><ShareSocialOutline /></NIcon>
              </button>
            </template>
            Share Chapter Link
          </NTooltip>
        </div>

        <StudyManagerModal v-model:show="isChapterModalOpen" />
        <RepertoireGeneratorModal v-model:show="isGeneratorModalOpen" />
      </div>
    </template>

    <template #left-panel>
      <div class="explorer-wrapper">
         <div class="explorer-toggle">
            <button :class="{ active: explorerMode === 'mozer' }" @click="explorerMode = 'mozer'">
              MozerBook
            </button>
            <button :class="{ active: explorerMode === 'lichess' }" @click="explorerMode = 'lichess'">
              Lichess
            </button>
          </div>
          <MozerBook v-if="explorerMode === 'mozer'" class="explorer-component" />
          <LichessOpeningExplorer v-else class="explorer-component" />
      </div>
    </template>

    <template #controls>
       <StudyControls />
    </template>

    <template #right-panel>
      <div class="right-panel-content">
        <EngineLines />
        <StudyTree />
      </div>
    </template>
  </GameLayout>
</template>

<style scoped>
.study-header {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chapter-select-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 8px 16px;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.2s;
  max-width: 100%;
}

.chapter-select-btn:hover {
  background: var(--color-bg-tertiary);
}

.icon-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 8px;
  color: var(--color-text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.icon-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-accent-primary);
}

.cloud-btn.active {
  background: rgba(34, 197, 94, 0.1);
  border-color: #22c55e;
  color: #22c55e;
}

.cloud-btn.active:hover {
  background: rgba(34, 197, 94, 0.2);
  border-color: #22c55e;
}

/* Spinner for Cloud Loading */
.loader-v2 {
  width: 1.2rem;
  height: 1.2rem;
  border: 2px solid currentColor;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.chapter-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.chapter-count {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.dropdown-icon {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

/* Modal Styles */
.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 60vh;
  overflow-y: auto;
}

.chapter-item {
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  gap: 10px;
  align-items: center;
}

.chapter-item:hover {
  background: var(--color-bg-secondary);
}

.chapter-item.active {
  background: var(--color-accent-primary-alpha);
  color: var(--color-accent-primary);
  font-weight: bold;
}

/* Explorer Styles */
.explorer-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.explorer-toggle {
  display: flex;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.explorer-toggle button {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.explorer-toggle button.active {
  color: var(--color-accent-primary);
  border-bottom-color: var(--color-accent-primary);
}

.explorer-component {
  flex: 1;
  min-height: 0;
}

/* Right Panel */
.right-panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 10px;
}

:deep(.study-tree-container) {
  flex: 1;
  min-height: 0;
}

@media (orientation: portrait) {
  .chapter-title {
     max-width: 150px;
     font-size: 0.9rem;
  }
}
</style>
