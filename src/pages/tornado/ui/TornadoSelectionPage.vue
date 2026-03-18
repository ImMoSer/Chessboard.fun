<!-- src/features/tornado/ui/TornadoSelectionView.vue -->
<script setup lang="ts">
import BaseSelectionLayout from '@/shared/ui/BaseSelectionLayout.vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'

const { t } = useI18n()
const router = useRouter()

const selectedCategory = ref('blitz')
const categories = ['bullet', 'blitz', 'rapid', 'classic']

function getIcon(cat: string) {
  const icons: Record<string, string> = {
    bullet: '⚡',
    blitz: '🔥',
    rapid: '🚶',
    classic: '⏳',
  }
  return icons[cat] || ''
}

function handleStart() {
  router.push({ name: 'tornado', params: { mode: selectedCategory.value } })
}
</script>

<template>
  <BaseSelectionLayout
    title="TORNADO"
    :subtitle="t('features.tornado.feedback.selectMode')"
    accent-color="var(--color-neon-bordeaux)"
    is-tornado
    @start="handleStart"
  >
    <template #categories>
      <button
        v-for="cat in categories"
        :key="cat"
        class="category-btn tornado-card"
        :class="{ active: selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        <span class="cat-icon">{{ getIcon(cat) }}</span>
        <span class="cat-name">{{ t(`features.tornado.modes.${cat}`) }}</span>
      </button>
    </template>
  </BaseSelectionLayout>
</template>
