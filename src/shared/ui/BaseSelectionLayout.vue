<!-- src/shared/ui/BaseSelectionLayout.vue -->
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  subtitle?: string
  accentColor?: string
  secondaryColor?: string
  categoryLabel?: string
  isTornado?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accentColor: 'var(--color-accent-primary)',
  secondaryColor: 'var(--color-accent-secondary)',
  isTornado: false,
})

defineEmits<{
  (e: 'start'): void
}>()

const startButtonStyle = computed(() => ({
  background: `linear-gradient(135deg, ${props.accentColor}, ${props.secondaryColor})`,
}))
</script>

<template>
  <div class="selection-container">
    <div class="glass-panel selection-card">
      <h1
        class="title"
        :class="{ 'tornado-title': isTornado }"
        :style="{ color: accentColor }"
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
        <button class="start-btn" :style="startButtonStyle" @click="$emit('start')">
          <slot name="start-button-label">START</slot>
        </button>
      </div>
    </div>
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
  padding: 10px;
  text-align: center;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}

.title {
  font-size: 2.3rem;
  margin-bottom: 1px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.title.tornado-title {
  font-size: 4rem;
  letter-spacing: 12px;
  margin-bottom: 15px;
}

.subtitle {
  color: var(--color-text-secondary);
  margin-bottom: 15px;
  font-size: 1.1rem;
}

.selection-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
}

:deep(.section) {
  display: flex;
  flex-direction: column;
  gap: 15px;
  text-align: left;
}

:deep(.section-label) {
  font-weight: 600;
  color: var(--color-text-default);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

:deep(.toggle-group) {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  padding: 6px;
  border-radius: 12px;
  gap: 6px;
}

:deep(.toggle-btn) {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
}

:deep(.toggle-btn.active) {
  background: v-bind('props.accentColor');
  color: var(--color-text-dark);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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

:deep(.category-btn) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
}

:deep(.category-btn:hover) {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.2);
}

:deep(.category-btn.active) {
  background: color-mix(in srgb, v-bind('props.accentColor') 15%, transparent);
  border-color: v-bind('props.accentColor');
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
}

:deep(.category-btn.tornado-card) {
  padding: 30px 20px;
  min-height: 140px;
  justify-content: center;
}

:deep(.cat-icon) {
  font-size: 1.8rem;
  color: white;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

:deep(.cat-icon-svg) {
  width: 32px;
  height: 32px;
  filter: brightness(0) invert(1) drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}

:deep(.cat-name) {
  color: var(--color-text-default);
  font-weight: 600;
  font-size: 0.85rem;
}

.start-btn {
  width: 100%;
  padding: 18px;
  border: none;
  border-radius: 15px;
  color: var(--color-text-dark);
  font-size: 1.25rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 3px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
}

.start-btn:hover {
  transform: scale(1.02) translateY(-2px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4);
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

  :deep(.section) {
    gap: 8px;
  }

  :deep(.section-label) {
    font-size: 0.65rem;
  }

  .category-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .category-grid.tornado-grid {
    gap: 12px;
  }

  :deep(.category-btn) {
    padding: 8px;
    border-radius: 10px;
    gap: 4px;
  }

  :deep(.cat-icon) {
    font-size: 1.05rem;
  }

  :deep(.cat-icon-svg) {
    width: 22px;
    height: 22px;
  }

  :deep(.cat-name) {
    font-size: 0.6rem;
  }

  .start-btn {
    padding: 12px;
    font-size: 0.85rem;
    letter-spacing: 2px;
    border-radius: 10px;
  }

  :deep(.toggle-group) {
    padding: 4px;
    border-radius: 8px;
  }

  :deep(.toggle-btn) {
    padding: 6px;
    font-size: 0.75rem;
    border-radius: 6px;
  }

  :deep(.category-btn.tornado-card) {
    padding: 15px 10px;
    min-height: 90px;
  }
}
</style>
