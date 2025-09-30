<!-- src/components/userCabinet/sections/TelegramBinding.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'
import { useUserCabinetStore } from '@/stores/userCabinet.store'

const { t } = useI18n()
const authStore = useAuthStore()
const { userProfile } = storeToRefs(authStore)
const userCabinetStore = useUserCabinetStore()
</script>

<template>
  <section v-if="userProfile" class="user-cabinet__telegram-section">
    <h3 class="user-cabinet__section-title">{{ t('userCabinet.telegram.title') }}</h3>
    <div v-if="userProfile.telegram_id" class="user-cabinet__telegram-status">
      ✅ {{ t('userCabinet.telegram.boundStatusSimple') }}
    </div>
    <button v-else @click="userCabinetStore.handleTelegramBind" class="user-cabinet__telegram-button">
      {{ t('userCabinet.telegram.bindButton') }}
    </button>
  </section>
</template>

<style scoped>
.user-cabinet__telegram-section {
  background-color: var(--color-bg-tertiary);
  padding: 15px;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border);
  margin-bottom: 20px;
}

.user-cabinet__section-title {
  font-size: var(--font-size-xlarge);
  color: #2aabee; /* Telegram blue */
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-hover);
  text-align: center;
}

.user-cabinet__telegram-button {
  display: block;
  width: 100%;
  max-width: 300px;
  margin: 10px auto;
  padding: 12px 20px;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: #ffffff;
  background-color: #2aabee;
  border: none;
  border-radius: var(--panel-border-radius);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
}

.user-cabinet__telegram-button:hover:not(:disabled) {
  background-color: #1a94d6;
  transform: translateY(-1px);
}

.user-cabinet__telegram-status {
  text-align: center;
  font-size: var(--font-size-base);
  color: var(--color-text-default);
  background-color: var(--color-bg-secondary);
  padding: 10px;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-accent-success);
}
</style>
