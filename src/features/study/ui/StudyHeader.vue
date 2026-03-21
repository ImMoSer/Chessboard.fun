<script setup lang="ts">
import { useStudyStore } from '@/features/study'
import {
  CloudOutline as CloudIcon,
  ChevronDownOutline as DropdownIcon,
  FlashOutline as GeneratorIcon,
  ShareSocialOutline as ShareIcon,
} from '@vicons/ionicons5'
import { NButton, NIcon, NSwitch, NTooltip, useMessage } from 'naive-ui'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import RepertoireGeneratorModal from './RepertoireGeneratorModal.vue'
import StudyManagerModal from './StudyManagerModal.vue'

const { t } = useI18n()
const studyStore = useStudyStore()
const message = useMessage()

const isChapterModalOpen = ref(false)
const isGeneratorModalOpen = ref(false)

const currentChapterName = computed(() => {
  const chapter = studyStore.chapters.find((c) => c.id === studyStore.activeChapterId)
  return chapter ? chapter.name : 'Select Chapter'
})

const chapterIndexDisplay = computed(() => {
  const index = studyStore.chapters.findIndex((c) => c.id === studyStore.activeChapterId)
  return index >= 0 ? `${index + 1}/${studyStore.chapters.length}` : ''
})

const handleCloudSave = async () => {
  if (!studyStore.activeChapter?.isStandard) {
    message.error(t('features.repertoire.notifications.onlyStandardCanBeSaved') || 'Only standard repertoires can be saved to the cloud.')
    return
  }

  try {
    if (studyStore.activeChapter?.slug) {
      if (studyStore.isOwner) {
        await studyStore.updateInCloud()
        message.success(t('features.repertoire.notifications.updated'))
      } else {
        message.error('Cannot save as copy to cloud.')
      }
    } else {
      await studyStore.saveToCloud()
      message.success(t('features.repertoire.notifications.saved'))
    }
  } catch (e: unknown) {
    const err = e instanceof Error ? e : { message: String(e) }
    message.error(err.message || t('features.repertoire.notifications.saveError'))
  }
}

const handleShare = () => {
  if (!studyStore.activeChapter?.slug) return
  const parts = studyStore.activeChapter.slug.split('_')
  const color = parts.pop()
  const lichessId = parts.join('_')
  const url = `${window.location.origin}/study/${lichessId}/${color}`
  navigator.clipboard.writeText(url)
  message.success(t('features.repertoire.notifications.shareLinkCopied'))
}
</script>

<template>
  <div class="study-header-container">
    <div class="header-glass-panel">
      <!-- Chapter Selection -->
      <div class="chapter-info" @click="isChapterModalOpen = true">
        <div class="chapter-main">
          <span class="chapter-name">{{ currentChapterName }}</span>
          <span class="chapter-count" v-if="chapterIndexDisplay">{{ chapterIndexDisplay }}</span>
        </div>
        <n-icon size="16" class="dropdown-arrow">
          <DropdownIcon />
        </n-icon>
      </div>

      <div class="header-divider"></div>

      <!-- Actions -->
      <div class="header-actions">
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button
              circle
              quaternary
              size="medium"
              @click="isGeneratorModalOpen = true"
            >
              <template #icon>
                <n-icon><GeneratorIcon /></n-icon>
              </template>
            </n-button>
          </template>
          {{ t('features.repertoire.repertoireGenerator') }}
        </n-tooltip>

        <n-tooltip trigger="hover" v-if="studyStore.activeChapter?.isStandard">
          <template #trigger>
            <n-button
              circle
              quaternary
              size="medium"
              :class="{ 'cloud-active': studyStore.isOwner && studyStore.activeChapter?.slug }"
              :disabled="studyStore.cloudLoading"
              @click="handleCloudSave"
            >
              <template #icon>
                <n-icon v-if="!studyStore.cloudLoading"><CloudIcon /></n-icon>
                <span v-else class="loader-v2-mini"></span>
              </template>
            </n-button>
          </template>
          {{
            !studyStore.activeChapter?.slug
              ? 'Save to Cloud'
              : studyStore.isOwner
                ? 'Update in Cloud'
                : 'Save as My Copy'
          }}
        </n-tooltip>

        <n-tooltip v-if="studyStore.activeChapter?.slug && studyStore.isOwner" trigger="hover">
          <template #trigger>
            <div class="public-toggle">
              <n-switch
                :value="studyStore.activeChapter?.isPublic !== false"
                @update:value="(val) => studyStore.togglePublicStatus(val)"
                size="small"
              >
                <template #checked>Public</template>
                <template #unchecked>Private</template>
              </n-switch>
            </div>
          </template>
          Toggle Public/Private
        </n-tooltip>

        <n-tooltip v-if="studyStore.activeChapter?.slug" trigger="hover">
          <template #trigger>
            <n-button
              circle
              quaternary
              size="medium"
              @click="handleShare"
            >
              <template #icon>
                <n-icon><ShareIcon /></n-icon>
              </template>
            </n-button>
          </template>
          Share Chapter Link
        </n-tooltip>
      </div>
    </div>

    <!-- Modals are kept local for clarity as they are header-specific -->
    <StudyManagerModal v-model:show="isChapterModalOpen" />
    <RepertoireGeneratorModal v-model:show="isGeneratorModalOpen" />
  </div>
</template>

<style scoped>
.study-header-container {
  width: 100%;
  max-width: 90vw;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px 0;
}

.header-glass-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 16px;
  background: var(--glass-bg, rgba(24, 24, 28, 0.7));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  backdrop-filter: var(--glass-blur, blur(12px));
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  max-width: 100%;
}

.chapter-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 12px;
  transition: all 0.2s ease;
  user-select: none;
  min-width: 0;
}

.chapter-info:hover {
  background: rgba(255, 255, 255, 0.05);
}

.chapter-main {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.chapter-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.chapter-count {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted, #888);
  white-space: nowrap;
}

.dropdown-arrow {
  color: var(--color-text-muted, #888);
  flex-shrink: 0;
}

.header-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.public-toggle {
  display: flex;
  align-items: center;
  padding: 0 5px;
}

.cloud-active {
  color: var(--color-success, #00ff55) !important;
}

.loader-v2-mini {
  width: 1rem;
  height: 1rem;
  border: 2px solid currentColor;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .chapter-name {
    max-width: 120px;
  }
}
</style>
