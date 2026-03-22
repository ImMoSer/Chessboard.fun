<template>
  <n-modal
    :show="show"
    preset="card"
    title="Lichess Study Access Required"
    style="width: 500px; max-width: 90vw;"
    :mask-closable="false"
    :closable="false"
  >
    <div class="p-4 space-y-4">
      <p class="text-base">
        To synchronize your studies directly with Lichess, this application requires permission to read and write to your Lichess studies.
      </p>

      <n-alert title="Why is this needed?" type="info" :show-icon="false">
        We need the <code>study:read</code> and <code>study:write</code> permissions to:
        <ul class="list-disc pl-5 mt-2 space-y-1">
          <li>Create new studies on your behalf</li>
          <li>Import PGN chapters to your studies</li>
          <li>Read your existing studies</li>
        </ul>
      </n-alert>

      <n-alert title="Security Note" type="warning" :show-icon="false">
        Your token is securely stored and only used for these specific study operations. You can revoke this access at any time in your Lichess account settings.
      </n-alert>

      <div class="flex justify-end space-x-3 mt-6">
        <n-button @click="$emit('cancel')">Cancel</n-button>
        <n-button type="primary" @click="handleAuthorize" :loading="isAuthorizing">
          Authorize via Lichess
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NAlert, NButton } from 'naive-ui'
import { useAuthStore } from '@/entities/user'

defineProps<{
  show: boolean
}>()

defineEmits<{
  (e: 'cancel'): void
}>()

const isAuthorizing = ref(false)
const authStore = useAuthStore()

const handleAuthorize = () => {
  isAuthorizing.value = true
  authStore.confirmLogin(['preference:read', 'study:read', 'study:write'])
}
</script>
