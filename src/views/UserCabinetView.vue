<!-- src/views/UserCabinetView.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'
import { useUserCabinetStore } from '@/stores/userCabinet.store'

import DetailedAnalytics from '@/components/userCabinet/DetailedAnalytics.vue'
import UserProfileHeader from '@/components/userCabinet/sections/UserProfileHeader.vue'
import TelegramBinding from '@/components/userCabinet/sections/TelegramBinding.vue'
import GlobalActivityStats from '@/components/userCabinet/sections/GlobalActivityStats.vue'
import TornadoHighScores from '@/components/userCabinet/sections/TornadoHighScores.vue'

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
    <div v-if="isLoading" class="loading-message">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-else-if="!isAuthenticated || !userProfile" class="login-prompt-container">
      <h3>{{ t('userCabinet.title') }}</h3>
      <p>{{ t('userCabinet.loginPrompt') }}</p>
      <button @click="authStore.login()" class="login-button">
        {{ t('nav.loginWithLichess') }}
      </button>
    </div>
    <div v-else class="user-cabinet-content">
      <UserProfileHeader />
      <TelegramBinding />
      <GlobalActivityStats />
      <DetailedAnalytics />
      <TornadoHighScores />
    </div>
  </div>
</template>

<style scoped>
.user-cabinet-container {
  padding: 5px;
  box-sizing: border-box;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-default);
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-width: 70vw;
  max-width: 1200px;
  margin: 20px auto;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
}

.loading-message,
.error-message {
  text-align: center;
  padding: 20px;
  font-size: var(--font-size-large);
}

.login-prompt-container {
  text-align: center;
  padding: 40px 20px;
}

.login-button {
  background-color: var(--color-accent-primary);
  color: var(--color-text-dark);
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.login-button:hover {
  background-color: var(--color-accent-primary-hover);
}
</style>