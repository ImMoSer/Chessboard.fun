<script setup lang="ts">
import { useStudyStore, type StudyChapter } from '../model/study.store'
import { NList, NListItem, NThing, NText, NScrollbar, NButton, NIcon, NSpace } from 'naive-ui'
import { computed, ref } from 'vue'
import { AddOutline, SettingsOutline, TrashOutline } from '@vicons/ionicons5'
import ChapterSettingsModal from './ChapterSettingsModal.vue'

const studyStore = useStudyStore()

const activeStudyChapters = computed(() => {
  if (!studyStore.activeStudy) return []
  return studyStore.chapters.filter(c => c.studyId === studyStore.activeStudy?.id)
})

const isLocalStudy = computed(() => {
  return studyStore.activeStudy && !studyStore.activeStudy.lichessId
})

const showSettingsModal = ref(false)
const isCreating = ref(false)
const selectedChapter = ref<StudyChapter | null>(null)

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
  await studyStore.deleteChapter(chapter.id)
}
</script>

<template>
  <div v-if="studyStore.activeStudy" class="study-sidebar">
    <div class="study-sidebar-header">
      <NText strong class="study-title">{{ studyStore.activeStudy.title }}</NText>
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
            <template #header-extra v-if="isLocalStudy">
              <NSpace size="small">
                <NButton size="tiny" quaternary circle @click="(e) => openSettings(chapter, e)">
                  <template #icon><NIcon><SettingsOutline /></NIcon></template>
                </NButton>
                <NButton size="tiny" quaternary circle type="error" @click="(e) => handleDeleteChapter(chapter, e)">
                  <template #icon><NIcon><TrashOutline /></NIcon></template>
                </NButton>
              </NSpace>
            </template>
          </NThing>
        </NListItem>
      </NList>

      <div class="sidebar-actions" v-if="isLocalStudy">
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
