<script setup lang="ts">
import { useStudyStore, type Study } from '../index'
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
  NThing,
  useMessage,
} from 'naive-ui'
import { computed, nextTick, ref } from 'vue'
import {
  AddOutline,
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
const activeTab = ref('my')
const showCreateForm = ref(false)
const newStudyTitle = ref('')
const pgnInput = ref('')
const lichessStudyInput = ref('')
const editingId = ref<string | null>(null)
const editName = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// --- COMPUTED ---
const myStudies = computed(() => studyStore.studies)

// --- ACTIONS ---

// Select Study
function selectStudy(study: Study) {
  const firstId = study.chapterIds[0]
  if (firstId) {
    studyStore.setActiveChapter(firstId)
    emit('update:show', false)
  }
}

// Lichess Import
async function handleLichessImport() {
  if (!lichessStudyInput.value.trim()) return

  let id = lichessStudyInput.value.trim()
  // Extract ID if URL is provided
  const match = id.match(/study\/([a-zA-Z0-9]{8})/)
  if (match && match[1]) {
    id = match[1]
  } else {
    // maybe user pasted https://lichess.org/study/bUmjtT4G.pgn ?
    const pgnMatch = id.match(/study\/([a-zA-Z0-9]{8})\.pgn/)
    if (pgnMatch && pgnMatch[1]) {
      id = pgnMatch[1]
    }
  }

  try {
    message.loading('Importing from Lichess...')
    await studyStore.importFromLichess(id)
    message.success('Lichess Study imported successfully!')
    lichessStudyInput.value = ''
    activeTab.value = 'my'
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Failed to import Lichess Study'
    message.error(error)
    console.error(e)
  }
}

// Create Study
async function handleCreateStudy() {
  if (!newStudyTitle.value.trim()) return

  await studyStore.createStudy(newStudyTitle.value)
  newStudyTitle.value = ''
  showCreateForm.value = false
  message.success('Study created')
}

// Import PGN
function handleImport(color: 'white' | 'black') {
  if (!pgnInput.value.trim()) return

  try {
    studyStore.createChapterFromPgn(pgnInput.value, undefined, color)
    pgnInput.value = ''
    message.success('PGN Imported successfully')
    activeTab.value = 'my' // Switch back to my chapters list
  } catch (e) {
    message.error('Failed to parse PGN')
    console.error(e)
  }
}

// Delete Study
async function confirmDeleteStudy(study: Study, e: Event) {
  e.stopPropagation()
  const result = await uiStore.showConfirmation(
    'Delete Study',
    `Are you sure you want to delete the study "${study.title}" and all its chapters?`,
  )
  if (result === 'confirm') {
    // Delete all chapters of this study
    const studyChapters = studyStore.chapters.filter((c) => c.studyId === study.id)
    for (const ch of studyChapters) {
      await studyStore.deleteChapter(ch.id)
    }
    await studyStore.deleteStudy(study.id)
    message.success('Study deleted')
  }
}

// Edit Study Title
async function startEditStudy(study: Study, e: Event) {
  e.stopPropagation()
  editingId.value = study.id
  editName.value = study.title
  await nextTick()
  editInputRef.value?.focus()
}

function finishEditStudy() {
  if (editingId.value && editName.value.trim()) {
    const study = studyStore.studies.find(s => s.id === editingId.value)
    if (study) {
      study.title = editName.value.trim()
      studyStore.saveStudy(study)
    }
  }
  editingId.value = null
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
      <NTabPane name="my" tab="My">
        <NSpace vertical>
          <!-- Actions Header -->
          <NSpace justify="space-between">
            <NButton type="primary" @click="showCreateForm = !showCreateForm">
              <template #icon>
                <NIcon><AddOutline /></NIcon>
              </template>
              Local Study
            </NButton>
          </NSpace>

          <!-- New Study Form -->
          <div v-if="showCreateForm" class="create-form">
            <NInput
              v-model:value="newStudyTitle"
              placeholder="Study Title"
              @keyup.enter="handleCreateStudy"
              autofocus
            />
            <NSpace justify="end" style="margin-top: 10px">
              <NButton size="small" @click="showCreateForm = false">Cancel</NButton>
              <NButton type="primary" size="small" @click="handleCreateStudy">Create</NButton>
            </NSpace>
          </div>

          <!-- Studies List -->
          <div v-if="myStudies.length > 0">
            <h3 class="section-title">Your Studies</h3>
            <NList hoverable clickable>
              <NListItem
                v-for="study in myStudies"
                :key="study.id"
                :class="{ active: studyStore.activeStudy?.id === study.id }"
                @click="selectStudy(study)"
              >
                <NThing>
                  <template #header>
                    <div v-if="editingId === study.id" class="edit-input-wrapper">
                      <input
                        ref="editInputRef"
                        v-model="editName"
                        @click.stop
                        @blur="finishEditStudy"
                        @keyup.enter="finishEditStudy"
                        class="native-edit-input"
                      />
                    </div>
                    <span v-else>{{ study.title }}</span>
                  </template>
                  <template #description>
                    <span style="color: #888">{{ study.chapterIds.length }} Chapters</span>
                  </template>
                  <template #header-extra>
                    <NSpace size="small">
                      <NButton
                        v-if="editingId !== study.id"
                        size="tiny"
                        secondary
                        circle
                        @click="(e) => startEditStudy(study, e)"
                      >
                        <template #icon><NIcon><PencilOutline /></NIcon></template>
                      </NButton>
                      <NButton
                        size="tiny"
                        secondary
                        circle
                        type="error"
                        @click="(e) => confirmDeleteStudy(study, e)"
                      >
                        <template #icon><NIcon><TrashOutline /></NIcon></template>
                      </NButton>
                    </NSpace>
                  </template>
                </NThing>
              </NListItem>
            </NList>
          </div>

          <div v-if="myStudies.length === 0" class="empty-state">
            No studies yet.
          </div>
        </NSpace>
      </NTabPane>

      <NTabPane name="import_external" tab="Import">
        <NSpace vertical size="large">
          
          <div class="create-form">
            <h3>Lichess Study</h3>
            <p style="font-size: 0.85em; color: #888; margin-bottom: 8px;">
              Enter a public Lichess Study URL or ID to import all its chapters.
            </p>
            <NInput
              v-model:value="lichessStudyInput"
              placeholder="e.g. https://lichess.org/study/bUmjtT4G"
              @keyup.enter="handleLichessImport"
            />
            <NSpace justify="end" style="margin-top: 10px">
              <NButton type="primary" :loading="studyStore.cloudLoading" @click="handleLichessImport">
                Import from Lichess
              </NButton>
            </NSpace>
          </div>

          <div class="create-form">
            <h3>Raw PGN</h3>
            <NInput
              v-model:value="pgnInput"
              type="textarea"
              placeholder="Paste PGN here..."
              :rows="6"
            />
            <NSpace justify="end" style="margin-top: 10px">
              <NButton @click="handleImport('white')">Import for White</NButton>
              <NButton type="primary" @click="handleImport('black')">Import for Black</NButton>
            </NSpace>
          </div>

        </NSpace>
      </NTabPane>
    </NTabs>
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
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.color-dot.white {
  background: #eee;
}
.color-dot.black {
  background: #333;
  border-color: #666;
}

.active {
  background-color: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 4px;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: var(--color-text-secondary);
}

.section-title {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 4px;
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
