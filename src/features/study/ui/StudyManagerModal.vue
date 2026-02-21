<script setup lang="ts">
import { pgnService } from '@/shared/lib/pgn/PgnService'
import { useStudyStore, type StudyChapter } from '@/features/study/model/study.store'
import { useUiStore } from '@/shared/ui/model/ui.store'
import {
  NButton,
  NIcon,
  NInput,
  NList,
  NListItem,
  NModal,
  NSpace,
  NTabPane,
  NTabs,
  NTag,
  NThing,
  useMessage,
} from 'naive-ui'
import { nextTick, ref } from 'vue'
import ChapterTemplateModal from './ChapterTemplateModal.vue'

import {
  AddOutline,
  CloudOutline,
  CreateOutline,
  DownloadOutline,
  PencilOutline,
  TrashOutline,
} from '@vicons/ionicons5'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const studyStore = useStudyStore()
const uiStore = useUiStore()
const message = useMessage()

// State
const activeTab = ref('chapters')
const showCreateForm = ref(false)
const showTemplateModal = ref(false)
const newChapterName = ref('')
const selectedColor = ref<'white' | 'black'>('white')
const pgnInput = ref('')
const editingId = ref<string | null>(null)
const editName = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// --- ACTIONS ---

// Select Chapter
function selectChapter(id: string) {
  studyStore.setActiveChapter(id)
  emit('update:show', false)
}

// Create Manual
function handleCreateManual() {
  if (!newChapterName.value.trim()) return

  studyStore.createChapter(newChapterName.value, undefined, selectedColor.value)
  newChapterName.value = ''
  showCreateForm.value = false
  message.success('Chapter created')
}

// Import PGN
function handleImport(color: 'white' | 'black') {
  if (!pgnInput.value.trim()) return

  try {
    studyStore.createChapterFromPgn(pgnInput.value, undefined, color)
    pgnInput.value = ''
    message.success('PGN Imported successfully')
    activeTab.value = 'chapters' // Switch back to chapters list
  } catch (e) {
    message.error('Failed to parse PGN')
    console.error(e)
  }
}

// Edit Name
async function startEdit(chapter: StudyChapter, e: Event) {
  e.stopPropagation()
  editingId.value = chapter.id
  editName.value = chapter.name
  await nextTick()
  editInputRef.value?.focus()
}

function finishEdit() {
  if (editingId.value && editName.value.trim()) {
    studyStore.updateChapterMetadata(editingId.value, { name: editName.value.trim() })
  }
  editingId.value = null
}

// Delete
async function confirmDelete(chapter: StudyChapter, e: Event) {
  e.stopPropagation()
  const result = await uiStore.showConfirmation(
    'Delete Chapter',
    `Are you sure you want to delete "${chapter.name}"?`,
  )
  if (result === 'confirm') {
    studyStore.deleteChapter(chapter.id)
    message.success('Chapter deleted')
  }
}

// Download
function downloadChapter(chapter: StudyChapter, e: Event) {
  e.stopPropagation()
  const currentRoot = pgnService.getRootNode()
  const currentPath = pgnService.getCurrentPath()

  pgnService.setRoot(chapter.root)
  const pgn = pgnService.getFullPgn(chapter.tags)

  // Restore
  pgnService.setRoot(currentRoot, currentPath)

  const blob = new Blob([pgn], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${chapter.name.replace(/\s+/g, '_')}.pgn`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <NModal
    :show="show"
    @update:show="(v) => emit('update:show', v)"
    preset="card"
    title="Study Manager"
    style="width: 600px; max-width: 95vw"
    :bordered="false"
    size="huge"
  >
    <NTabs v-model:value="activeTab" type="segment" animated>
      <NTabPane name="chapters" tab="Chapters">
        <NSpace vertical>
          <!-- Actions Header -->
          <NSpace justify="space-between">
            <NButton type="primary" @click="showCreateForm = !showCreateForm">
              <template #icon>
                <NIcon><AddOutline /></NIcon>
              </template>
              New Chapter
            </NButton>
            <NButton secondary @click="showTemplateModal = true">
              <template #icon>
                <NIcon><CreateOutline /></NIcon>
              </template>
              Template
            </NButton>
          </NSpace>

          <!-- New Chapter Form -->
          <div v-if="showCreateForm" class="create-form">
            <NInput
              v-model:value="newChapterName"
              placeholder="Chapter Name"
              @keyup.enter="handleCreateManual"
              autofocus
            />
            <NSpace style="margin-top: 10px">
              <NButton
                size="small"
                :type="selectedColor === 'white' ? 'primary' : 'default'"
                @click="selectedColor = 'white'"
              >
                For White
              </NButton>
              <NButton
                size="small"
                :type="selectedColor === 'black' ? 'primary' : 'default'"
                @click="selectedColor = 'black'"
              >
                For Black
              </NButton>
            </NSpace>
            <NSpace justify="end" style="margin-top: 10px">
              <NButton size="small" @click="showCreateForm = false">Cancel</NButton>
              <NButton type="primary" size="small" @click="handleCreateManual">Create</NButton>
            </NSpace>
          </div>

          <!-- Chapters List -->
          <NList hoverable clickable>
            <NListItem
              v-for="(chapter, index) in studyStore.chapters"
              :key="chapter.id"
              :class="{ active: studyStore.activeChapterId === chapter.id }"
              @click="selectChapter(chapter.id)"
            >
              <NThing>
                <template #avatar>
                   <div
                     class="color-dot"
                     :class="chapter.color"
                     :title="chapter.color ? `For ${chapter.color}` : 'No color'"
                   ></div>
                </template>

                <template #header>
                    <div v-if="editingId === chapter.id" class="edit-input-wrapper">
                        <input
                            ref="editInputRef"
                            v-model="editName"
                            @click.stop
                            @blur="finishEdit"
                            @keyup.enter="finishEdit"
                            class="native-edit-input"
                        />
                    </div>
                    <span v-else>{{ index + 1 }}. {{ chapter.name }}</span>
                </template>

                 <template #header-extra>
                    <NTag v-if="chapter.slug" size="small" type="info" :bordered="false">
                        <template #icon><NIcon><CloudOutline /></NIcon></template>
                        Cloud
                    </NTag>
                 </template>

                 <template #action>
                    <NSpace v-if="editingId !== chapter.id" size="small">
                        <NButton size="tiny" secondary circle @click="(e) => downloadChapter(chapter, e)">
                             <template #icon><NIcon><DownloadOutline /></NIcon></template>
                        </NButton>
                        <NButton size="tiny" secondary circle @click="(e) => startEdit(chapter, e)">
                             <template #icon><NIcon><PencilOutline /></NIcon></template>
                        </NButton>
                         <NButton size="tiny" secondary circle type="error" @click="(e) => confirmDelete(chapter, e)">
                             <template #icon><NIcon><TrashOutline /></NIcon></template>
                        </NButton>
                    </NSpace>
                 </template>
              </NThing>
            </NListItem>
             <div v-if="studyStore.chapters.length === 0" class="empty-state">
                No chapters yet. Create one!
            </div>
          </NList>
        </NSpace>
      </NTabPane>

      <NTabPane name="import" tab="Import PGN">
        <NSpace vertical>
          <NInput
            v-model:value="pgnInput"
            type="textarea"
            placeholder="Paste PGN here..."
            :rows="8"
          />
          <NSpace justify="end">
            <NButton @click="handleImport('white')">Import for White</NButton>
            <NButton type="primary" @click="handleImport('black')">Import for Black</NButton>
          </NSpace>
        </NSpace>
      </NTabPane>
    </NTabs>

    <ChapterTemplateModal v-model:show="showTemplateModal" />
  </NModal>
</template>

<style scoped>
.create-form {
  background: rgba(255, 255, 255, 0.05);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 10px;
  border: 1px solid var(--color-border);
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
}
.color-dot.white { background: #eee; }
.color-dot.black { background: #333; border-color: #666; }

.active {
  background-color: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 4px;
}

.empty-state {
    text-align: center;
    padding: 20px;
    color: var(--color-text-secondary);
}

.native-edit-input {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-primary);
    color: var(--color-text-primary);
    padding: 2px 5px;
    border-radius: 4px;
    width: 100%;
}
</style>
