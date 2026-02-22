<script setup lang="ts">
import {
    theoryChaptersService,
    type TheoryChapterTemplate,
} from '@/features/theory-endings/api/TheoryChaptersService';
import { useStudyStore } from '@/features/study';
import { NCard, NInput, NList, NListItem, NModal, NSpace, NText, NThing } from 'naive-ui';
import { computed, ref } from 'vue';

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'select', template: TheoryChapterTemplate): void
}>()

const studyStore = useStudyStore()
const searchQuery = ref('')
const isLoading = ref(false)
const chapters = ref<TheoryChapterTemplate[]>([])
const selectedColor = ref<'white' | 'black'>('white')

const filteredChapters = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if (!query) return chapters.value

  return chapters.value.filter(
    (c: TheoryChapterTemplate) => c.name.toLowerCase().includes(query) || c.eco.toLowerCase().includes(query),
  )
})

const handleOpen = async () => {
  if (!chapters.value.length) {
    isLoading.value = true
    await theoryChaptersService.load()
    chapters.value = theoryChaptersService.getChapters()
    isLoading.value = false
  }
}

const selectTemplate = (template: TheoryChapterTemplate) => {
  try {
    studyStore.createChapterFromPgn(template.pgn, template.name, selectedColor.value)
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
  <n-modal
    :show="show"
    @update:show="(val) => emit('update:show', val)"
    :on-after-enter="handleOpen"
    class="template-modal"
  >
    <n-card
      title="Create from Template"
      :bordered="false"
      size="huge"
      role="dialog"
      aria-modal="true"
      closable
      @close="handleClose"
      style="width: 650px; max-width: 95vw; height: 85vh; display: flex; flex-direction: column"
      content-style="flex: 1; overflow: hidden; display: flex; flex-direction: column; padding-bottom: 0;"
    >
      <div class="modal-controls">
        <div class="color-toggle-container">
          <n-text depth="3" class="label">Choose your side:</n-text>
          <div class="color-toggle">
            <button
              :class="{ active: selectedColor === 'white' }"
              @click="selectedColor = 'white'"
              class="side-btn white"
            >
              White
            </button>
            <button
              :class="{ active: selectedColor === 'black' }"
              @click="selectedColor = 'black'"
              class="side-btn black"
            >
              Black
            </button>
          </div>
        </div>

        <n-input
          v-model:value="searchQuery"
          placeholder="Search openings (e.g. Sicilian, B20)..."
          clearable
          class="search-input"
        />
      </div>

      <div class="list-container">
        <n-list v-if="chapters.length > 0" hoverable clickable>
          <n-list-item
            v-for="chapter in filteredChapters"
            :key="chapter.name"
            @click="selectTemplate(chapter)"
          >
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
.modal-controls {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.color-toggle-container {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.03);
  padding: 10px 15px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.label {
  font-size: 0.9em;
  font-weight: 500;
}

.color-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
  padding: 3px;
  border-radius: 6px;
  width: 200px;
}

.side-btn {
  flex: 1;
  border: none;
  padding: 6px;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 600;
  border-radius: 4px;
  transition: all 0.2s;
  background: transparent;
  color: #888;
}

.side-btn.white.active {
  background: #eee;
  color: #222;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.side-btn.black.active {
  background: #333;
  color: #eee;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.search-input {
  width: 100%;
}

.list-container {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
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
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8em;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

:deep(.n-list-item) {
  padding: 12px 16px !important;
}

:deep(.n-thing-main__title) {
  font-size: 1.05em !important;
  font-weight: 600 !important;
}
</style>
