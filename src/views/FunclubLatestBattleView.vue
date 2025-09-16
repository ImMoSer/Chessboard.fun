<!-- src/views/FunclubLatestBattleView.vue -->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { webhookService } from '../services/WebhookService'
import type { LatestTeamBattleReport } from '../types/api.types'
import LatestBattleReport from '../components/clubPage/LatestBattleReport.vue'
import { changeLang } from '../services/i18n'

const { t } = useI18n()
const route = useRoute()

const report = ref<LatestTeamBattleReport | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

const loadDataForLanguage = async () => {
  isLoading.value = true
  error.value = null
  try {
    const langParam = route.params.lang
    if (langParam && ['en', 'ru', 'de'].includes(langParam as string)) {
      changeLang(langParam as 'en' | 'ru' | 'de')
    }

    const data = await webhookService.fetchLatestTeamBattleReport()
    if (data) {
      report.value = data
    } else {
      throw new Error(t('latestBattle.errors.noData'))
    }
  } catch (e: any) {
    error.value = e.message || t('errors.unknown')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadDataForLanguage)

watch(() => route.params.lang, loadDataForLanguage)
</script>

<template>
  <div class="page-container">
    <div v-if="isLoading" class="status-message">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="error" class="status-message error">
      {{ t('common.error') }}: {{ error }}
    </div>
    <LatestBattleReport v-else-if="report" :report="report" />
  </div>
</template>

<style scoped>
.page-container {
  /* --- НАЧАЛО ИЗМЕНЕНИЙ: Стили для создания чистого фона для скриншота --- */
  background-color: var(--color-bg-primary);
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  /* --- КОНЕЦ ИЗМЕНЕНИЙ --- */
}

.status-message {
  font-size: var(--font-size-xlarge);
  color: var(--color-text-muted);
  text-align: center;
  padding-top: 40vh;
}

.status-message.error {
  color: var(--color-text-error);
}
</style>
