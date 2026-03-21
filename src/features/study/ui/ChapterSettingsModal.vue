<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useStudyStore, type StudyChapter } from '../model/study.store'
import { openingChaptersService, type OpeningChapterTemplate } from '@/entities/opening'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NButton,
  NSpace,
  NTabs,
  NTabPane,
  NList,
  NListItem,
  NThing,
  NText,
  useMessage,
} from 'naive-ui'

const props = defineProps<{
  show: boolean
  chapter: StudyChapter | null
  isCreating?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const studyStore = useStudyStore()
const message = useMessage()

const activeTab = ref<'settings' | 'templates'>('settings')
const searchQuery = ref('')
const templates = ref<OpeningChapterTemplate[]>([])
const isLoadingTemplates = ref(false)

const formModel = ref({
  name: '',
  color: 'white' as 'white' | 'black' | undefined,
  eco: '',
  opening: '',
  result: '*',
})

const filteredTemplates = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if (!query) return templates.value

  return templates.value.filter(
    (t) => t.name.toLowerCase().includes(query) || t.eco.toLowerCase().includes(query)
  )
})

watch(
  () => props.show,
  async (isShown) => {
    if (isShown) {
      if (props.isCreating) {
        activeTab.value = 'settings'
        formModel.value = {
          name: `Chapter ${studyStore.activeStudy?.chapterIds.length || 0 + 1}`,
          color: 'white',
          eco: 'NULL',
          opening: 'NULL',
          result: '*',
        }
        // Prefetch templates if not loaded
        if (templates.value.length === 0) {
          isLoadingTemplates.value = true
          await openingChaptersService.load()
          templates.value = openingChaptersService.getChapters()
          isLoadingTemplates.value = false
        }
      } else if (props.chapter) {
        activeTab.value = 'settings'
        formModel.value = {
          name: props.chapter.name,
          color: props.chapter.color || 'white',
          eco: props.chapter.tags['ECO'] || 'NULL',
          opening: props.chapter.tags['Opening'] || 'NULL',
          result: props.chapter.tags['Result'] || '*',
        }
      }
    }
  }
)

async function handleSave() {
  if (!formModel.value.name.trim()) {
    message.error('Chapter name cannot be empty')
    return
  }

  if (props.isCreating) {
    const chapterId = await studyStore.createChapter(
      formModel.value.name,
      undefined,
      formModel.value.color
    )
    // Update newly created chapter's tags
    const chapter = studyStore.chapters.find(c => c.id === chapterId)
    if (chapter) {
      const updatedTags = {
        ...chapter.tags,
        ECO: formModel.value.eco,
        Opening: formModel.value.opening,
        Result: formModel.value.result,
      }
      studyStore.updateChapterMetadata(chapterId, { tags: updatedTags })
    }
    studyStore.setActiveChapter(chapterId)
    message.success('Chapter created')
  } else if (props.chapter) {
    const updatedTags = {
      ...props.chapter.tags,
      Event: formModel.value.name,
      ECO: formModel.value.eco,
      Opening: formModel.value.opening,
      Result: formModel.value.result,
    }

    studyStore.updateChapterMetadata(props.chapter.id, {
      name: formModel.value.name,
      color: formModel.value.color,
      tags: updatedTags,
    })
    message.success('Chapter updated')
  }

  emit('update:show', false)
}

async function selectTemplate(template: OpeningChapterTemplate) {
  try {
    if (!studyStore.activeStudy) return
    
    await studyStore.createChapterFromPgn(
      template.pgn, 
      template.name, 
      formModel.value.color,
      studyStore.activeStudy.id
    )
    message.success(`Created from template: ${template.name}`)
    emit('update:show', false)
  } catch (e) {
    message.error('Failed to create from template')
    console.error(e)
  }
}
</script>

<template>
  <NModal
    :show="show"
    @update:show="(v) => emit('update:show', v)"
    preset="card"
    :title="isCreating ? 'Add New Chapter' : 'Chapter Settings'"
    style="width: 500px; max-width: 95vw"
  >
    <NTabs v-model:value="activeTab" type="segment" animated>
      <NTabPane name="settings" tab="Basic Info">
        <div style="padding-top: 15px">
          <NForm :model="formModel" label-placement="left" label-width="100">
            <NFormItem label="Name" path="name">
              <NInput v-model:value="formModel.name" placeholder="e.g. Sicilian Dragon" />
            </NFormItem>
            
            <NFormItem label="Your Color" path="color">
              <NSelect
                v-model:value="formModel.color"
                :options="[
                  { label: 'White', value: 'white' },
                  { label: 'Black', value: 'black' }
                ]"
              />
            </NFormItem>

            <NFormItem label="ECO" path="eco">
              <NInput v-model:value="formModel.eco" placeholder="e.g. B76" />
            </NFormItem>

            <NFormItem label="Opening" path="opening">
              <NInput v-model:value="formModel.opening" placeholder="e.g. Sicilian Defense" />
            </NFormItem>

            <NFormItem label="Result" path="result">
              <NInput v-model:value="formModel.result" placeholder="e.g. 1-0, 0-1, 1/2-1/2 or *" />
            </NFormItem>

            <NSpace justify="end" style="margin-top: 20px">
              <NButton @click="emit('update:show', false)">Cancel</NButton>
              <NButton type="primary" @click="handleSave">
                {{ isCreating ? 'Create Chapter' : 'Save Changes' }}
              </NButton>
            </NSpace>
          </NForm>
        </div>
      </NTabPane>

      <NTabPane v-if="isCreating" name="templates" tab="From Template">
        <div style="padding-top: 15px">
          <NSpace vertical>
            <div class="color-hint">
              <NText depth="3">The selected color ({{ formModel.color }}) will be applied to the template.</NText>
            </div>
            <NInput
              v-model:value="searchQuery"
              placeholder="Search openings..."
              clearable
            />
            <div class="template-list-container">
              <NList hoverable clickable>
                <NListItem
                  v-for="template in filteredTemplates"
                  :key="template.name"
                  @click="selectTemplate(template)"
                >
                  <NThing :title="template.name">
                    <template #description>
                      <NText depth="3" class="eco-tag">{{ template.eco }}</NText>
                    </template>
                  </NThing>
                </NListItem>
                <div v-if="filteredTemplates.length === 0" class="empty-state">
                  No templates found.
                </div>
              </NList>
            </div>
          </NSpace>
        </div>
      </NTabPane>
    </NTabs>
  </NModal>
</template>

<style scoped>
.template-list-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.eco-tag {
  font-family: monospace;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8em;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: var(--color-text-muted);
}

.color-hint {
  background: rgba(var(--color-primary-rgb), 0.05);
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid var(--color-accent-primary);
  margin-bottom: 8px;
}
</style>

