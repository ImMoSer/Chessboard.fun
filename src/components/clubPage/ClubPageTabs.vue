<!-- src/components/clubPage/ClubPageTabs.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ClubPageTabId } from '../../views/FunclubView.vue'

const { t } = useI18n()

// Определяем props и emits для взаимодействия с родителем
defineProps<{
  activeTab: ClubPageTabId
}>()

const emit = defineEmits<{
  (e: 'setActiveTab', tabId: ClubPageTabId): void
}>()

// Массив для генерации вкладок, чтобы сделать шаблон чище
const tabs: { id: ClubPageTabId; labelKey: string }[] = [
  { id: 'overview', labelKey: 'clubPage.tabs.overview' },
  { id: 'key_indicators', labelKey: 'clubPage.tabs.keyIndicators' },
  { id: 'play_style', labelKey: 'clubPage.tabs.playStyle' },
  { id: 'medals', labelKey: 'clubPage.tabs.medals' },
]
</script>

<template>
  <div class="club-page__tabs">
    <button v-for="tab in tabs" :key="tab.id" class="club-page__tab-button" :class="{ active: activeTab === tab.id }"
      @click="emit('setActiveTab', tab.id)">
      {{ t(tab.labelKey) }}
    </button>
  </div>
</template>

<style scoped>
.club-page__tabs {
  display: flex;
  gap: 10px;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: -2px;
  flex-wrap: wrap;
}

.club-page__tab-button {
  padding: 10px 20px;
  cursor: pointer;
  background-color: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: var(--font-size-large);
  color: var(--color-text-muted);
  transition: all 0.2s ease;
  font-family: var(--font-family-primary);
}

.club-page__tab-button:hover {
  color: var(--color-text-default);
  background-color: var(--color-bg-tertiary);
}

.club-page__tab-button.active {
  color: var(--color-accent-primary);
  border-bottom-color: var(--color-accent-primary);
  font-weight: var(--font-weight-bold);
}

@media (orientation: portrait) {
  .club-page__tabs {
    gap: 5px;
    padding-bottom: 0;
  }

  .club-page__tab-button {
    padding: 8px 12px;
    font-size: var(--font-size-xsmall);
  }
}
</style>
