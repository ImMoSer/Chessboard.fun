<script setup lang="ts">
import { NModal, NText, NButton, NSpace, NIcon } from 'naive-ui'
import { AlertCircleOutline } from '@vicons/ionicons5'

defineProps<{
  show: boolean
  status?: number
  message: string
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()
</script>

<template>
  <NModal
    :show="show"
    @update:show="(v) => emit('update:show', v)"
    preset="card"
    title="Lichess API ERROR"
    style="width: 400px"
  >
    <NSpace vertical align="center" size="large">
      <NIcon size="48" color="#ff4757">
        <AlertCircleOutline />
      </NIcon>
      
      <div style="text-align: center">
        <NText depth="3" style="font-size: 0.9em; display: block; margin-bottom: 8px">
          Status Code: {{ status || 'Unknown' }}
        </NText>
        <NText strong style="font-size: 1.1em">
          {{ message }}
        </NText>
      </div>

      <NButton block type="primary" @click="emit('update:show', false)">
        Understood
      </NButton>
    </NSpace>
  </NModal>
</template>
