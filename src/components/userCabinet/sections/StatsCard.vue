<!-- src/components/userCabinet/sections/StatsCard.vue -->
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
  },
  accuracy: {
    type: Number,
    required: true,
  },
  solved: {
    type: Number,
    required: true,
  },
  attempted: {
    type: Number,
    required: true,
  },
})

const accuracyColor = computed(() => {
  if (props.accuracy >= 85) return 'var(--color-accent-success)'
  if (props.accuracy >= 60) return 'var(--color-accent-warning)'
  return 'var(--color-accent-error)'
})

const progressCircleStyle = computed(() => ({
  background: `radial-gradient(closest-side, var(--color-bg-tertiary) 79%, transparent 80% 100%),
    conic-gradient(${accuracyColor.value} ${props.accuracy}%, var(--color-bg-secondary) 0)`,
}))
</script>

<template>
  <div class="stats-card">
    <h4 class="card-title">{{ title }}</h4>
    <div class="card-content">
      <div class="rating-section">
        <div class="rating-label">Рейтинг</div>
        <div class="rating-value">{{ rating }}</div>
      </div>
      <div class="accuracy-section">
        <div class="progress-circle" :style="progressCircleStyle">
          <span class="accuracy-value">{{ accuracy }}%</span>
        </div>
        <div class="solved-attempts">
          {{ solved }} / {{ attempted }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-card {
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.stats-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-accent-primary);
}

.card-title {
  margin: 0;
  text-align: center;
  font-size: var(--font-size-large);
  color: var(--color-text-default);
  font-weight: var(--font-weight-bold);
  border-bottom: 1px solid var(--color-border-hover);
  padding-bottom: 10px;
}

.card-content {
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 15px;
}

.rating-section {
  text-align: center;
}

.rating-label {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
  margin-bottom: 5px;
}

.rating-value {
  font-size: var(--font-size-xlarge);
  font-weight: var(--font-weight-bold);
  color: var(--color-accent-primary);
}

.accuracy-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.progress-circle {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.accuracy-value {
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  color: v-bind(accuracyColor);
}

.solved-attempts {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
  font-weight: var(--font-weight-bold);
}
</style>
