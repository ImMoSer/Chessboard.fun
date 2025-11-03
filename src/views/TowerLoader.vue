// src/views/TowerLoader.vue
<template>
  <div class="loading-container">
    <p>{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTowerStore } from '@/stores/tower.store'
import { TOWER_IDS, TOWER_THEMES, type TowerId, type TowerTheme } from '@/types/api.types'
import i18n from '@/services/i18n'

const props = defineProps<{
  difficulty: string
  theme: string
}>()

const router = useRouter()
const towerStore = useTowerStore()
const { t } = i18n.global

const message = ref(t('common.loading'))

onMounted(async () => {
  const difficulty = props.difficulty.toUpperCase() as TowerId
  const theme = props.theme as TowerTheme

  const isValidDifficulty = TOWER_IDS.includes(difficulty)
  const isValidTheme = TOWER_THEMES.includes(theme)

  if (isValidDifficulty && isValidTheme) {
    await towerStore.startNewTower(difficulty, theme)
    // Предполагается, что у вас есть маршрут для отображения самого режима Tower,
    // например, по пути '/tower'. Если путь другой, измените его.
    router.push('/tower') 
  } else {
    message.value = t('tower.error.towerNotFound')
    // Если параметры неверны, перенаправляем на главную страницу через 3 секунды
    setTimeout(() => {
      router.push('/')
    }, 3000)
  }
})
</script>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 1.5rem;
}
</style>
