<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NModal, NCard, NInput, NList, NListItem, NThing, NSpace, NText, NSpin
} from 'naive-ui'
import { openingChaptersService, type OpeningChapterTemplate } from '@/services/OpeningChaptersService'
import { useStudyStore } from '@/stores/study.store'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'select', template: OpeningChapterTemplate): void
}>()

const studyStore = useStudyStore()
const searchQuery = ref('')
const isLoading = ref(false)
const chapters = ref<OpeningChapterTemplate[]>([])

const filteredChapters = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if (!query) return chapters.value

  return chapters.value.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.eco.toLowerCase().includes(query)
  )
})

const handleOpen = async () => {
  if (!chapters.value.length) {
    isLoading.value = true
    await openingChaptersService.load()
    chapters.value = openingChaptersService.getChapters()
    isLoading.value = false
  }
}

const selectTemplate = (template: OpeningChapterTemplate) => {
  try {
    studyStore.createChapterFromPgn(template.pgn, template.name)
    emit('update:show', false)
  } catch {
    // Error handling handled in store/console
  }
}

const handleClose = () => {
  emit('update:show', false)
}
</script>

<template>
  <n-modal :show="show" @update:show="(val) => emit('update:show', val)" :on-after-enter="handleOpen"
    class="template-modal">
    <n-card title="Create from Template" :bordered="false" size="huge" role="dialog" aria-modal="true" closable
      @close="handleClose" style="width: 600px; max-width: 90vw; height: 80vh; display: flex; flex-direction: column;"
      content-style="flex: 1; overflow: hidden; display: flex; flex-direction: column; padding-bottom: 0;">
      <n-space vertical class="search-container">
        <n-input v-model:value="searchQuery" placeholder="Search openings (e.g. Sicilian, B20)..." clearable />
      </n-space>

      <div class="list-container">
        <div v-if="isLoading" class="loading-state">
          <n-spin size="medium" />
          <n-text depth="3">Loading templates...</n-text>
        </div>

        <n-list v-else hoverable clickable>
          <n-list-item v-for="chapter in filteredChapters" :key="chapter.name" @click="selectTemplate(chapter)">
            <n-thing :title="chapter.name">
              <template #description>
                <n-space size="small">
                  <n-text depth="3" class="eco-tag">{{ chapter.eco }}</n-text>
                </n-space>
              </template>
            </n-thing>
          </n-list-item>

          <div v-if="!isLoading && filteredChapters.length === 0" class="empty-state">
            <n-text depth="3">No templates found.</n-text>
          </div>
        </n-list>
      </div>
    </n-card>
  </n-modal>
</template>

<style scoped>
.search-container {
  margin-bottom: 16px;
}

.list-container {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg-primary);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  gap: 10px;
}

.eco-tag {
  font-family: monospace;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.8em;
}
</style>
