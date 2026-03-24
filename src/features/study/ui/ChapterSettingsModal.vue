<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStudyStore, type StudyChapter } from '../model/study.store'
import { openingChaptersService, type OpeningChapterTemplate } from '@/entities/opening'
import {
  LinkOutline,
  ShareOutline
} from '@vicons/ionicons5'
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
  NIcon,
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
const { t } = useI18n()

const activeTab = ref<'settings' | 'templates' | 'raw_pgn'>('settings')
const searchQuery = ref('')
const templates = ref<OpeningChapterTemplate[]>([])
const isLoadingTemplates = ref(false)
const pgnInput = ref('')

const formModel = ref({
  name: '',
  color: 'white' as 'white' | 'black' | undefined,
  eco: '',
  opening: '',
  result: '*',
})

const lichessStudyUrl = computed(() => {
  if (!studyStore.activeStudy?.lichessId) return null
  return `https://lichess.org/study/${studyStore.activeStudy.lichessId}`
})

const lichessChapterUrl = computed(() => {
  if (!studyStore.activeStudy?.lichessId || !props.chapter?.lichessChapterId) return null
  return `https://lichess.org/study/${studyStore.activeStudy.lichessId}/${props.chapter.lichessChapterId}`
})

const localAppUrl = computed(() => {
  const chapter = props.chapter || studyStore.activeChapter
  if (!chapter) return null
  
  const studyId = chapter.studyId || 'local'
  const chapterId = chapter.lichessChapterId || chapter.id
  
  return `${window.location.origin}/study/${studyId}/${chapterId}`
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
        pgnInput.value = ''
        formModel.value = {
          name: `${t('features.study.sidebar.addChapter')} ${studyStore.activeStudy?.chapterIds.length || 0 + 1}`,
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
        pgnInput.value = ''
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

async function handleImportPgn() {
  if (!pgnInput.value.trim()) return

  try {
    if (!studyStore.activeStudy) return
    
    await studyStore.createChapterFromPgn(
      pgnInput.value, 
      formModel.value.name !== `${t('features.study.sidebar.addChapter')} ${studyStore.activeStudy.chapterIds.length + 1}` ? formModel.value.name : undefined, 
      formModel.value.color,
      studyStore.activeStudy.id
    )
    pgnInput.value = ''
    message.success(t('features.study.chapterSettings.pgn.success'))
    emit('update:show', false)
  } catch (e) {
    message.error(t('features.study.chapterSettings.pgn.error'))
    console.error(e)
  }
}

async function handleSave() {
  if (!formModel.value.name.trim()) {
    message.error(t('features.study.chapterSettings.errors.emptyName'))
    return
  }

  if (props.isCreating) {
    const chapterId = await studyStore.createChapter(
      formModel.value.name,
      undefined,
      formModel.value.color
    )
    if (!chapterId) {
      message.error(t('features.study.chapterSettings.errors.failedToCreate'))
      return
    }
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
    message.success(t('features.study.chapterSettings.messages.created'))
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
    message.success(t('features.study.chapterSettings.messages.updated'))
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
    message.success(t('features.study.chapterSettings.templates.createdFrom', { name: template.name }))
    emit('update:show', false)
  } catch (e) {
    message.error(t('features.study.chapterSettings.templates.noTemplates'))
    console.error(e)
  }
}

async function handleCopyLink() {
  if (!localAppUrl.value) return
  try {
    await navigator.clipboard.writeText(localAppUrl.value)
    message.success(t('common.actions.linkCopied'))
  } catch {
    message.error(t('common.actions.copyFailed'))
  }
}

async function handleShare() {
  if (!localAppUrl.value) return
  if (navigator.share) {
    try {
      await navigator.share({
        title: props.chapter?.name || 'Chess Study',
        url: localAppUrl.value
      })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        handleCopyLink()
      }
    }
  } else {
    handleCopyLink()
  }
}

function openUrl(url: string | null) {
  if (url) window.open(url, '_blank')
}
</script>

<template>
  <NModal
    :show="show"
    @update:show="(v) => emit('update:show', v)"
    preset="card"
    :title="isCreating ? t('features.study.chapterSettings.addChapter') : t('features.study.chapterSettings.settings')"
    style="width: 500px; max-width: 95vw"
    :auto-focus="false"
    :trap-focus="false"
  >
    <NTabs v-model:value="activeTab" type="segment" animated>
      <NTabPane name="settings" :tab="t('features.study.chapterSettings.tabs.basicInfo')">
        <div style="padding-top: 15px">
          <NForm :model="formModel" label-placement="left" label-width="100">
            <NFormItem :label="t('features.study.chapterSettings.form.name')" path="name">
              <NInput v-model:value="formModel.name" :placeholder="t('features.study.chapterSettings.form.namePlaceholder')" />
            </NFormItem>
            
            <NFormItem :label="t('features.study.chapterSettings.form.color')" path="color">
              <NSelect
                v-model:value="formModel.color"
                :options="[
                  { label: t('features.study.chapterSettings.form.white'), value: 'white' },
                  { label: t('features.study.chapterSettings.form.black'), value: 'black' }
                ]"
              />
            </NFormItem>

            <NFormItem :label="t('features.study.chapterSettings.form.eco')" path="eco">
              <NInput v-model:value="formModel.eco" :placeholder="t('features.study.chapterSettings.form.ecoPlaceholder')" />
            </NFormItem>

            <NFormItem :label="t('features.study.chapterSettings.form.opening')" path="opening">
              <NInput v-model:value="formModel.opening" :placeholder="t('features.study.chapterSettings.form.openingPlaceholder')" />
            </NFormItem>

            <NFormItem :label="t('features.study.chapterSettings.form.result')" path="result">
              <NInput v-model:value="formModel.result" :placeholder="t('features.study.chapterSettings.form.resultPlaceholder')" />
            </NFormItem>

            <div class="lichess-links">
              <NSpace vertical size="small">
                <div v-if="localAppUrl" class="lichess-link-item">
                  <NText depth="3">{{ t('features.study.chapterSettings.links.localApp') }}</NText>
                  <NSpace size="small" style="margin-top: 4px">
                    <NButton size="small" tertiary class="action-btn" @click="handleCopyLink">
                      <template #icon><NIcon class="neon-icon"><LinkOutline/></NIcon></template>
                      {{ t('common.actions.copyLink') }}
                    </NButton>
                    <NButton size="small" tertiary class="action-btn" @click="handleShare">
                      <template #icon><NIcon class="neon-icon"><ShareOutline/></NIcon></template>
                      {{ t('common.controls.share') }}
                    </NButton>
                  </NSpace>
                </div>

                <div v-if="lichessStudyUrl || lichessChapterUrl" class="lichess-link-item" style="margin-top: 12px">
                  <NText depth="3">Lichess Links:</NText>
                  <NSpace size="small" style="margin-top: 4px; width: 100%;">
                    <NButton v-if="lichessStudyUrl" size="small" tertiary class="action-btn" @click="openUrl(lichessStudyUrl)">
                      <template #icon>
                        <NIcon class="lichess-orange-icon">
                          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19,22H5V20H19V22M17,10C15,7 13,3 8,2C9.5,4.5 10.5,7 10.5,10C10.5,12 9.5,14 8,16C10.5,16 13,15 15,13C16.5,11.5 17,11 17,10M17,18H7V16H17V18Z" /></svg>
                        </NIcon>
                      </template>
                      Open Study
                    </NButton>
                    <NButton v-if="lichessChapterUrl" size="small" tertiary class="action-btn" @click="openUrl(lichessChapterUrl)">
                      <template #icon>
                        <NIcon class="lichess-orange-icon">
                          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19,22H5V20H19V22M17,10C15,7 13,3 8,2C9.5,4.5 10.5,7 10.5,10C10.5,12 9.5,14 8,16C10.5,16 13,15 15,13C16.5,11.5 17,11 17,10M17,18H7V16H17V18Z" /></svg>
                        </NIcon>
                      </template>
                      Open Chapter
                    </NButton>
                  </NSpace>
                </div>
              </NSpace>
            </div>

            <NSpace justify="end" style="margin-top: 20px">
              <NButton @click="emit('update:show', false)">{{ t('features.study.chapterSettings.actions.cancel') }}</NButton>
              <NButton type="primary" @click="handleSave">
                {{ isCreating ? t('features.study.chapterSettings.actions.create') : t('features.study.chapterSettings.actions.save') }}
              </NButton>
            </NSpace>
          </NForm>
        </div>
      </NTabPane>

      <NTabPane v-if="isCreating" name="templates" :tab="t('features.study.chapterSettings.tabs.fromTemplate')">
        <div style="padding-top: 15px">
          <NSpace vertical>
            <div class="color-hint">
              <NText depth="3">{{ t('features.study.chapterSettings.templates.colorHint', { color: formModel.color }) }}</NText>
            </div>
            <NInput
              v-model:value="searchQuery"
              :placeholder="t('features.study.chapterSettings.templates.search')"
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
                  {{ t('features.study.chapterSettings.templates.noTemplates') }}
                </div>
              </NList>
            </div>
          </NSpace>
        </div>
      </NTabPane>

      <NTabPane v-if="isCreating" name="raw_pgn" :tab="t('features.study.chapterSettings.tabs.rawPgn')">
        <div style="padding-top: 15px">
          <NSpace vertical>
            <div class="color-hint">
              <NText depth="3">{{ t('features.study.chapterSettings.pgn.colorHint', { color: formModel.color }) }}</NText>
            </div>
            <NInput
              v-model:value="pgnInput"
              type="textarea"
              :placeholder="t('features.study.chapterSettings.pgn.placeholder')"
              :rows="8"
            />
            <NSpace justify="end" style="margin-top: 10px">
              <NButton @click="emit('update:show', false)">{{ t('features.study.chapterSettings.actions.cancel') }}</NButton>
              <NButton type="primary" :disabled="!pgnInput.trim()" @click="handleImportPgn">
                {{ t('features.study.chapterSettings.actions.import') }}
              </NButton>
            </NSpace>
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

.lichess-links {
  margin-top: 20px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed var(--color-border);
  border-radius: 4px;
}

.lichess-link-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.link {
  color: var(--color-accent-primary);
  text-decoration: none;
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 4px;
}

.link:hover {
  text-decoration: underline;
}

.action-btn {
  flex: 1;
}

.neon-icon {
  color: var(--neon-blue);
}

.lichess-orange-icon {
  color: var(--neon-orange);
}
</style>

