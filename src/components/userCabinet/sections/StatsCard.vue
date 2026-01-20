<!-- src/components/userCabinet/sections/StatsCard.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  title: { type: String, required: true },
  rating: { type: Number, default: 0 },
  accuracy: { type: Number, required: true },
  solved: { type: Number, required: true },
  attempted: { type: Number, required: true },
})

const accuracyStatus = computed(() => {
  if (props.accuracy >= 85) return 'success'
  if (props.accuracy >= 60) return 'warning'
  return 'error'
})
</script>

<template>
  <n-card hoverable class="theme-stat-card" size="small">
    <template #header>
      <n-ellipsis style="max-width: 100%">
        <span class="card-title">{{ title }}</span>
      </n-ellipsis>
    </template>

    <div class="card-body">
      <n-statistic
        v-if="rating > 0"
        :label="t('userCabinet.analyticsTable.rating')"
        :value="rating"
      >
        <template #prefix>📈</template>
      </n-statistic>
      <div v-else class="rating-placeholder"></div>

      <div class="accuracy-box">
        <n-progress
          type="circle"
          :percentage="accuracy"
          :status="accuracyStatus"
          :stroke-width="10"
          :show-indicator="true"
          size="small"
        />
        <n-text depth="3" class="attempts-text"> {{ solved }} / {{ attempted }} </n-text>
      </div>
    </div>
  </n-card>
</template>

<style scoped>
.theme-stat-card {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  transition: border-color 0.3s ease;
}

.theme-stat-card:hover {
  border-color: var(--color-accent-primary);
}

.card-title {
  font-family: var(--font-family-primary);
  font-weight: bold;
  font-size: var(--font-size-base);
}

.card-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.accuracy-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.attempts-text {
  font-size: var(--font-size-xsmall);
  font-family: var(--font-family-primary);
}

:deep(.n-statistic-label) {
  font-size: var(--font-size-xsmall);
}

:deep(.n-statistic-value__content) {
  font-size: var(--font-size-large);
  color: var(--color-accent-primary);
}
</style>
