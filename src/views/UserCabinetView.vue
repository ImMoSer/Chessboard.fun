<!-- src/views/UserCabinetView.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'
import { useUserCabinetStore } from '@/stores/userCabinet.store'

import DetailedAnalytics from '@/components/userCabinet/DetailedAnalytics.vue'
import UserProfileHeader from '@/components/userCabinet/sections/UserProfileHeader.vue'
import TornadoHighScores from '@/components/userCabinet/sections/TornadoHighScores.vue'
import GlobalActivityStats from '@/components/userCabinet/sections/GlobalActivityStats.vue'

const { t } = useI18n()

const authStore = useAuthStore()
const { userProfile, isAuthenticated } = storeToRefs(authStore)

const userCabinetStore = useUserCabinetStore()
const { isLoading, error } = storeToRefs(userCabinetStore)

onMounted(() => {
  userCabinetStore.initializePage()
})
</script>

<template>
  <div class="user-cabinet-container">
    <div v-if="isLoading" class="state-container">
      <n-spin size="large" />
    </div>

    <n-alert v-else-if="error" type="error" closable class="error-alert">
      {{ error }}
    </n-alert>

    <div v-else-if="!isAuthenticated || !userProfile" class="login-prompt">
      <n-result status="403" :title="t('userCabinet.title')" :description="t('userCabinet.loginPrompt')">
        <template #footer>
          <n-button type="primary" size="large" @click="authStore.login()">
            {{ t('nav.loginWithLichess') }}
          </n-button>
        </template>
      </n-result>
    </div>

    <div v-else class="user-cabinet-content">
      <n-space vertical size="large">
        <UserProfileHeader />

        <TornadoHighScores />

        <GlobalActivityStats />

        <DetailedAnalytics />
      </n-space>
    </div>
  </div>
</template>

<style scoped>
.user-cabinet-container {
  padding: 24px;
  max-width: 1200px;
  margin: 20px auto;
}

.state-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.login-prompt {
  padding: 60px 0;
  background-color: var(--color-bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border-hover);
}

@media (max-width: 768px) {
  .user-cabinet-container {
    padding: 12px;
  }
}
</style>
