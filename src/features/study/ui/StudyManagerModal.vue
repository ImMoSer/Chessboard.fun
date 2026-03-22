<script setup lang="ts">
import { useStudyStore, type Study } from '../index'
import { useAuthStore } from '@/entities/user'
import { useUiStore } from '@/shared/ui/model/ui.store'
import { lichessSyncService, LichessApiError } from '../api/LichessSyncService'
import LichessErrorModal from './LichessErrorModal.vue'
import {
  NButton,
  NIcon,
  NList,
  NListItem,
  NModal,
  NSpace,
  NTabPane,
  NTabs,
  NThing,
  NSpin,
  NAlert,
  useMessage,
} from 'naive-ui'
import { computed, nextTick, ref, watch } from 'vue'
import {
  PencilOutline,
  TrashOutline,
  CloudDownloadOutline
} from '@vicons/ionicons5'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const studyStore = useStudyStore()
const authStore = useAuthStore()
const uiStore = useUiStore()
const message = useMessage()

// State
const activeTab = ref('my')
const editingId = ref<string | null>(null)
const editName = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// Lichess Studies State
interface LichessStudyPreview {
  id: string
  name: string
  updatedAt: number
}
const lichessStudies = ref<LichessStudyPreview[]>([])
const isLoadingLichessStudies = ref(false)

// Error Modal State
const showErrorModal = ref(false)
const errorStatus = ref<number | undefined>(undefined)
const errorMessage = ref('')

// --- COMPUTED ---
const myStudies = computed(() => studyStore.studies)

// --- WATCHERS ---
watch(() => props.show, (newShow) => {
  if (newShow && activeTab.value === 'import_external') {
    fetchLichessStudies()
  }
})

watch(activeTab, (newTab) => {
  if (newTab === 'import_external') {
    fetchLichessStudies()
  }
})

// --- ACTIONS ---

async function fetchLichessStudies() {
  const username = authStore.userProfile?.username
  if (!username) return

  isLoadingLichessStudies.value = true
  try {
    const studies = await lichessSyncService.fetchUserStudies(username)
    // Sort by most recently updated
    lichessStudies.value = studies.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch (error) {
    console.error('Failed to fetch user studies', error)
    message.error('Failed to load your Lichess studies')
  } finally {
    isLoadingLichessStudies.value = false
  }
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString()
}

// Select Study
function selectStudy(study: Study) {
  const firstId = study.chapterIds[0]
  if (firstId) {
    studyStore.setActiveChapter(firstId)
    emit('update:show', false)
  }
}

// Lichess Import
async function handleLichessImport(id: string) {
  try {
    message.loading('Importing from Lichess...')
    await studyStore.importFromLichess(id)
    message.success('Lichess Study imported successfully!')
    activeTab.value = 'my'
  } catch (e: unknown) {
    if (e instanceof Error && e.message && e.message.startsWith('OWNERSHIP_REQUIRED:')) {
       const studyIdToClone = e.message.split(':')[1]
       const cloneUrl = `https://lichess.org/study/${studyIdToClone}/clone`
       
       uiStore.showConfirmation(
         'Lichess Study Clone Required',
         `You cannot modify a study you don't own. Please clone it to your Lichess account first. \n\nClick OK to open Lichess, clone the study, and then import your new study ID here.`,
         { confirmText: 'OK, Clone it' }
       ).then((res) => {
          if (res === 'confirm') {
             window.open(cloneUrl, '_blank', 'noopener,noreferrer')
          }
       })
       return
    }

    if (e instanceof LichessApiError) {
      errorStatus.value = e.status
      errorMessage.value = e.message
      showErrorModal.value = true
    } else {
      const error = e instanceof Error ? e.message : 'Failed to import Lichess Study'
      message.error(error)
    }
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
    style="width: 600px; max-width: 95vw; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;"
    :bordered="false"
    size="huge"
    :auto-focus="false"
    :trap-focus="false"
  >
    <NTabs v-model:value="activeTab" type="segment" animated>
      <NTabPane name="my" tab="My Studies">
        <NSpace vertical style="max-height: 60vh; overflow-y: auto; padding-right: 10px;">

          <!-- Studies List -->
          <div v-if="myStudies.length > 0">
            <h3 class="section-title">Your Imported Studies</h3>
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
            No studies yet. Go to Import to get started.
          </div>
        </NSpace>
      </NTabPane>

      <NTabPane name="import_external" tab="Import from Lichess">
        <NSpace vertical size="large" style="max-height: 60vh; overflow-y: auto; padding-right: 10px;">
          
          <div class="create-form">
            <h3>Your Lichess Studies</h3>
            
            <NAlert type="info" :show-icon="false" style="margin-bottom: 15px;">
              Select a study from your Lichess account to import. If you want to import a study from someone else, please open it on Lichess and clone it to your account first.
            </NAlert>

            <div v-if="isLoadingLichessStudies" class="loading-state">
              <NSpin size="medium" />
              <div style="margin-top: 10px; color: #888;">Loading your Lichess studies...</div>
            </div>

            <div v-else-if="lichessStudies.length === 0" class="empty-state">
              No studies found on your Lichess account. 
              <br><br>
              <a href="https://lichess.org/study" target="_blank" style="color: var(--color-accent-primary);">
                Create one on Lichess
              </a>
            </div>

            <NList v-else hoverable>
              <NListItem v-for="study in lichessStudies" :key="study.id">
                <NThing>
                  <template #header>
                    {{ study.name }}
                  </template>
                  <template #description>
                    <span style="color: #888">Updated: {{ formatDate(study.updatedAt) }}</span>
                  </template>
                  <template #header-extra>
                    <NButton 
                      size="small" 
                      type="primary" 
                      secondary
                      :disabled="myStudies.some(s => s.lichessId === study.id)"
                      :loading="studyStore.cloudLoading" 
                      @click="handleLichessImport(study.id)"
                    >
                      <template #icon><NIcon><CloudDownloadOutline /></NIcon></template>
                      {{ myStudies.some(s => s.lichessId === study.id) ? 'Imported' : 'Import' }}
                    </NButton>
                  </template>
                </NThing>
              </NListItem>
            </NList>
          </div>

        </NSpace>
      </NTabPane>
    </NTabs>

    <LichessErrorModal
      v-model:show="showErrorModal"
      :status="errorStatus"
      :message="errorMessage"
    />
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

.active {
  background-color: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 4px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
}

.loading-state {
  text-align: center;
  padding: 40px 20px;
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
