<script setup lang="ts">
import { ref } from 'vue'
import { useStudyStore } from '../model/study.store'
import {
  NModal,
  NForm,
  NFormItem,
  NSelect,
  NButton,
  NSpace,
  useMessage,
} from 'naive-ui'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const studyStore = useStudyStore()
const message = useMessage()

const formModel = ref({
  visibility: 'public' as 'public' | 'unlisted' | 'private',
  chat: 'everyone',
  cloneable: 'everyone',
  computer: 'everyone',
  explorer: 'everyone',
  shareable: 'everyone',
})

const options = [
  { label: 'Nobody', value: 'nobody' },
  { label: 'Owner', value: 'owner' },
  { label: 'Contributor', value: 'contributor' },
  { label: 'Member', value: 'member' },
  { label: 'Everyone', value: 'everyone' },
]

async function handlePublish() {
  try {
    message.loading('Creating study on Lichess...')
    await studyStore.publishToLichess(formModel.value)
    localStorage.setItem('publish_study_time', Date.now().toString())
    message.success('Study published to Lichess!')
    emit('update:show', false)
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Failed to publish study'
    message.error(error)
  }
}
</script>

<template>
  <NModal
    :show="show"
    @update:show="(v) => emit('update:show', v)"
    preset="card"
    title="Publish Study to Lichess"
    style="width: 450px"
  >
    <NForm :model="formModel" label-placement="left" label-width="120">
      <NFormItem label="Visibility" path="visibility">
        <NSelect
          v-model:value="formModel.visibility"
          :options="[
            { label: 'Public', value: 'public' },
            { label: 'Unlisted', value: 'unlisted' },
            { label: 'Private', value: 'private' }
          ]"
        />
      </NFormItem>

      <NFormItem label="Chat" path="chat">
        <NSelect v-model:value="formModel.chat" :options="options" />
      </NFormItem>

      <NFormItem label="Cloneable" path="cloneable">
        <NSelect v-model:value="formModel.cloneable" :options="options" />
      </NFormItem>

      <NFormItem label="Engine" path="computer">
        <NSelect v-model:value="formModel.computer" :options="options" />
      </NFormItem>

      <NFormItem label="Explorer" path="explorer">
        <NSelect v-model:value="formModel.explorer" :options="options" />
      </NFormItem>

      <NFormItem label="Shareable" path="shareable">
        <NSelect v-model:value="formModel.shareable" :options="options" />
      </NFormItem>

      <NSpace justify="end" style="margin-top: 20px">
        <NButton @click="emit('update:show', false)">Cancel</NButton>
        <NButton type="primary" :loading="studyStore.cloudLoading" @click="handlePublish">
          Create on Lichess
        </NButton>
      </NSpace>
    </NForm>
  </NModal>
</template>
