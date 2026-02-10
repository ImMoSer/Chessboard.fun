<!-- src/views/ModeSelectionView.vue -->
<script setup lang="ts">
import { type TornadoMode } from '@/types/api.types'
import {
  FlashOutline as BlitzIcon,
  FlameOutline as BulletIcon,
  HourglassOutline as ClassicIcon,
  WalkOutline as RapidIcon,
} from '@vicons/ionicons5'
import { NCard, NGrid, NGridItem, NIcon, NText } from 'naive-ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const gameMode = computed(() => (route.meta.gameMode as 'tornado') || 'tornado')

const title = computed(() => {
  return t(`${gameMode.value}.selection.title`)
})

const tornadoModes = [
  { id: 'bullet', icon: BulletIcon, time: '1 + 1' },
  { id: 'blitz', icon: BlitzIcon, time: '3 + 2' },
  { id: 'rapid', icon: RapidIcon, time: '5 + 3' },
  { id: 'classic', icon: ClassicIcon, time: '10 + 5' },
] as const

const modes = computed(() => {
  return tornadoModes.map((m) => {
    const fullLabel = t(`tornado.modes.${m.id}`)
    // Extract name before parenthesis if exists
    const label = fullLabel.includes(' (') ? fullLabel.split(' (')[0] : fullLabel
    return {
      ...m,
      label,
    }
  })
})

const selectMode = (modeId: TornadoMode) => {
  const puzzleId = route.params.puzzleId as string | undefined
  if (puzzleId && gameMode.value === 'tornado') {
    router.push(`/${gameMode.value}/${puzzleId}/${modeId}`)
  } else {
    router.push(`/${gameMode.value}/${modeId}`)
  }
}
</script>

<template>
  <div class="selection-wrapper">
    <div class="header-section">
      <h1 class="pro-title">{{ title }}</h1>
      <div class="title-underline"></div>
    </div>

    <div class="modes-grid-container">
      <n-grid :cols="2" :x-gap="24" :y-gap="24" responsive="screen" :breakpoints="{ xs: 1, s: 2 }">
        <n-grid-item v-for="mode in modes" :key="mode.id">
          <n-card hoverable class="mode-pro-card" @click="selectMode(mode.id as TornadoMode)">
            <div class="card-inner">
              <div class="icon-container">
                <n-icon size="40" class="mode-icon-accent">
                  <component :is="mode.icon" />
                </n-icon>
              </div>
              <div class="text-container">
                <n-text class="time-main-display">{{ mode.time }}</n-text>
                <n-text depth="3" class="mode-label-display">{{ mode.label }}</n-text>
              </div>
            </div>
          </n-card>
        </n-grid-item>
      </n-grid>
    </div>
  </div>
</template>

<style scoped>
.selection-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 40px 20px;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  box-sizing: border-box; /* Гарантируем, что паддинги не расширяют элемент */
  overflow-x: hidden; /* Защита от вылетов */
}

.header-section {
  text-align: center;
  margin-bottom: 50px;
  width: 100%;
}

.pro-title {
  font-size: 2.5rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 4px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #fff 0%, var(--color-text-secondary) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  word-wrap: break-word; /* Продвинутый перенос для мобильных */
  line-height: 1.2;
}

.title-underline {
  height: 4px;
  width: 60px;
  background: var(--color-accent-warning);
  margin: 0 auto;
  border-radius: 2px;
}

.modes-grid-container {
  width: 100%;
  box-sizing: border-box;
}

.mode-pro-card {
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  backdrop-filter: blur(10px);
  width: 100%;
  box-sizing: border-box;
}

.mode-pro-card:hover {
  transform: translateY(-8px);
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--color-accent-warning);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.card-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 10px;
  gap: 16px;
  width: 100%;
  box-sizing: border-box;
}

.icon-container {
  padding: 16px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.mode-pro-card:hover .icon-container {
  background: rgba(var(--color-accent-warning-rgb, 255, 170, 0), 0.1);
  border-color: var(--color-accent-warning);
}

.mode-icon-accent {
  color: var(--color-accent-warning);
  transition: transform 0.3s ease;
}

.mode-pro-card:hover .mode-icon-accent {
  transform: scale(1.1) rotate(5deg);
}

.text-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.time-main-display {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1;
  font-family: inherit;
  white-space: nowrap; /* Не даем времени разлетаться на 2 строки */
}

.mode-label-display {
  font-size: 1.1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* Response for Mobile */
@media (max-width: 640px) {
  .selection-wrapper {
    padding: 10px 8px; /* Немного уменьшил, чтобы дать больше места контенту */
    justify-content: flex-start;
    min-height: auto;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden; /* Жесткая блокировка горизонтального скролла */
  }

  .header-section {
    margin-bottom: 20px;
    margin-top: 5px;
  }

  .pro-title {
    font-size: 1.2rem; /* Уменьшил для суперсжатых экранов */
    letter-spacing: 1px;
    padding: 0 4px;
  }

  .modes-grid-container {
    padding: 0;
    width: 100%;
  }

  :deep(.n-grid) {
    gap: 8px !important; /* Уменьшил gap для экономии места */
  }

  .time-main-display {
    font-size: 1.5rem; /* Оптимально для 2 колонок на мобилках */
  }

  .mode-label-display {
    font-size: 0.75rem;
    letter-spacing: 0.5px;
  }

  .card-inner {
    padding: 10px 2px;
    gap: 4px;
  }

  .icon-container {
    padding: 6px;
  }

  :deep(.n-icon) {
    font-size: 20px !important; /* Еще компактнее иконки */
  }

  .mode-pro-card {
    border-radius: 10px;
    margin-bottom: 2px; /* Место для тени внизу */
  }
}

/* Landscape on very small height devices */
@media (max-height: 500px) and (orientation: landscape) {
  .selection-wrapper {
    padding: 10px;
  }
  .header-section {
    margin-bottom: 10px;
  }
  .time-main-display {
    font-size: 1.5rem;
  }
}
</style>
