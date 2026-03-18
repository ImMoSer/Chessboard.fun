<script setup lang="ts">
import { NCard } from 'naive-ui'
import { computed } from 'vue'

interface Props {
  title: string
  subtitle?: string
  accentType?: 'primary' | 'warning' | 'error' | 'success' | 'info'
  categoryLabel?: string
  isTornado?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accentType: 'primary',
  isTornado: false,
})

defineEmits<{
  (e: 'start'): void
}>()

const accentColorVar = computed(() => `var(--color-${props.accentType})`)
</script>

<template>
  <div class="selection-container">
    <n-card class="glass selection-card" :bordered="false">
      <h1
        class="title"
        :class="{ 'tornado-title': isTornado }"
        :style="{ color: accentColorVar }"
      >
        <slot name="title">{{ title }}</slot>
      </h1>
      <p v-if="subtitle || $slots.subtitle" class="subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </p>

      <div class="selection-sections">
        <slot name="sections"></slot>

        <div v-if="$slots.categories" class="section">
          <label v-if="categoryLabel" class="section-label">{{ categoryLabel }}</label>
          <div class="category-grid" :class="{ 'tornado-grid': isTornado }">
            <slot name="categories"></slot>
          </div>
        </div>
      </div>

      <div class="actions">
        <button 
          class="start-btn" 
          :class="{ 'exam-btn': accentType === 'warning' || accentType === 'error' }"
          @click="$emit('start')"
        >
          <slot name="start-button-label">START</slot>
        </button>
      </div>
    </n-card>
  </div>
</template>

<style scoped>
.selection-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 20px;
}

.selection-card {
  width: 100%;
  max-width: 650px;
  border-radius: 20px;
  padding: 10px;
}

.title {
  font-size: 2.3rem;
  margin-bottom: 1px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-align: center;
}

.title.tornado-title {
  font-size: 4rem;
  letter-spacing: 12px;
  margin-bottom: 15px;
}

.subtitle {
  color: var(--text-secondary);
  margin-bottom: 15px;
  font-size: 1.1rem;
  text-align: center;
}

.selection-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}

:deep(.section) {
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}

:deep(.section-label) {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
}

.category-grid.tornado-grid {
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

:deep(.category-card) {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;
  border: 1px solid transparent;
  background: var(--bg-1);
  border-radius: 14px;
  padding: 15px 10px;
}

:deep(.category-card:hover) {
  transform: translateY(-4px);
  border-color: var(--glass-highlight);
}

:deep(.category-card.active) {
  background: var(--bg-2);
  border-color: v-bind(accentColorVar);
  box-shadow: 0 0 15px var(--color-primary-glow);
}

:deep(.cat-icon) {
  font-size: 1.8rem;
  color: var(--white);
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  display: block;
  margin-bottom: 8px;
}

:deep(.cat-icon-svg) {
  width: 32px;
  height: 32px;
  filter: brightness(0) invert(1) drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
  display: block;
  margin: 0 auto 8px;
}

:deep(.cat-name) {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.85rem;
}

/* Mobile Adaptation */
@media (max-width: 600px) {
  .selection-card {
    padding: 8px;
    border-radius: 12px;
  }
  .title {
    font-size: 1.25rem;
    letter-spacing: 1px;
  }
  .title.tornado-title {
    font-size: 2rem;
    letter-spacing: 4px;
    margin-bottom: 15px;
  }
  .subtitle {
    font-size: 0.65rem;
    margin-bottom: 14px;
  }
  .selection-sections {
    gap: 14px;
    margin-bottom: 20px;
  }
  .category-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
}
</style>
