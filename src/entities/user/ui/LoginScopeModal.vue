<template>
  <n-modal
    :show="authStore.isLoginModalVisible"
    preset="card"
    title="Login via Lichess"
    style="width: 500px; max-width: 90vw;"
    :mask-closable="true"
    @update:show="(val) => !val && authStore.cancelLogin()"
  >
    <div class="p-4 space-y-6">
      <p class="text-base text-gray-700">
        Choose the permissions you want to grant to ExtraPawn.
      </p>

      <div class="space-y-4">
        <!-- Base Permission -->
        <div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <n-checkbox :checked="true" disabled />
          <div>
            <div class="font-medium">Read Preferences</div>
            <div class="text-sm text-gray-500">Required to read your basic profile info and site preferences.</div>
          </div>
        </div>

        <!-- Study Permission -->
        <div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer" @click="toggleStudyScope">
          <n-checkbox v-model:checked="enableStudyScope" @click.stop />
          <div>
            <div class="font-medium">Lichess Study Access (Optional)</div>
            <div class="text-sm text-gray-500">
              Allows the app to read your private studies and push new chapters directly to Lichess. Recommended if you want to use the Cloud Sync features.
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end space-x-3 pt-4">
        <n-button @click="authStore.cancelLogin()">Cancel</n-button>
        <n-button type="primary" @click="handleContinue" :loading="authStore.isLoading">
          Continue to Lichess
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NCheckbox, NButton } from 'naive-ui'
import { useAuthStore } from '../model/auth.store'

const authStore = useAuthStore()
const enableStudyScope = ref(false)

const toggleStudyScope = () => {
  enableStudyScope.value = !enableStudyScope.value
}

const handleContinue = () => {
  const scopes = ['preference:read']
  if (enableStudyScope.value) {
    scopes.push('study:read', 'study:write')
  }
  authStore.confirmLogin(scopes)
}
</script>
