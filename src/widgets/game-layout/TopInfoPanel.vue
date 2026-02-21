<!-- src/widgets/game-layout/TopInfoPanel.vue -->
<script setup lang="ts">
import type { PuzzleUnion } from '@/types/api.types'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import EngineSelector from '@/features/engine/ui/EngineSelector.vue'
import { useControlsStore } from '@/widgets/game-layout/model/controls.store'
import { useDiamondHunterStore } from '@/features/diamond-hunter/model/diamondHunter.store'
import { useFinishHimStore } from '@/features/finish-him/model/finishHim.store'
import { useGameStore } from '@/entities/game/model/game.store'
import { usePracticalChessStore } from '@/features/practical-chess/model/practicalChess.store'
import { useTheoryEndingsStore } from '@/features/theory-endings/model/theoryEndings.store'
import { useTornadoStore } from '@/features/tornado/model/tornado.store'
import { transformPuzzle } from '@/utils/puzzleTransformer'
import { BarChartOutline, DiamondOutline, FlashOutline, TrendingUpOutline } from '@vicons/ionicons5'
import { NIcon, NTag } from 'naive-ui'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const route = useRoute()

const tornadoStore = useTornadoStore()
const finishHimStore = useFinishHimStore()
const theoryStore = useTheoryEndingsStore()
const practicalStore = usePracticalChessStore()
const diamondHunterStore = useDiamondHunterStore()
const gameStore = useGameStore()
useControlsStore()

const activePuzzle = computed<PuzzleUnion | null>(() => {
  if (route.name === 'tornado') return tornadoStore.activePuzzle as PuzzleUnion
  if (route.name?.toString().startsWith('theory-endings')) return theoryStore.activePuzzle as PuzzleUnion
  if (route.name?.toString().startsWith('practical-chess')) return practicalStore.activePuzzle as PuzzleUnion
  return finishHimStore.activePuzzle as PuzzleUnion
})

const displayTask = computed(() => transformPuzzle(activePuzzle.value, t))

const isYouMoveHidden = computed(() => {
  const puzzle = activePuzzle.value
  if (route.name?.toString().startsWith('practical-chess') && puzzle) {
    if ('category' in puzzle) {
      return puzzle.category === 'materialEquality' && gameStore.gamePhase !== 'GAMEOVER'
    }
  }
  return false
})

const activeThemeKey = computed<string>(() => {
  if (route.name === 'tornado') {
    return (tornadoStore.sessionTheme || 'auto') as string
  }
  const puzzle = activePuzzle.value
  if (!puzzle) return 'auto'

  if ('category' in puzzle && typeof puzzle.category === 'string') {
    return puzzle.category as string
  }

  if ('themes' in puzzle && Array.isArray(puzzle.themes) && puzzle.themes.length > 0) {
      return puzzle.themes[0] as string
  }

  return 'auto'
})

const themeTranslation = computed(() => {
  const key = activeThemeKey.value
  if (key === 'auto') {
    return route.name === 'tornado' ? t('chess.tornado.auto') : t('chess.finishHim.category.auto') // or just 'Automatic'
  }

  if (route.name === 'tornado') {
    return t(`chess.tornado.${key}`)
  }

  if (route.name?.toString().startsWith('theory-endings') || route.name?.toString().startsWith('practical-chess')) {
    return t(`chess.endings.${key}`)
  }

  return t(`chess.finishHim.category.${key}`)
})

const formattedTimer = computed(() => {
  if (route.name === 'tornado') {
    return tornadoStore.formattedTimer
  }
  return '--:--'
})

const containerClass = computed(() => {
  switch (route.name) {
    case 'finish-him':
    case 'finish-him-play':
    case 'finish-him-puzzle':
      return 'mode-finish-him'
    case 'tornado':
      return 'mode-tornado'
    case 'diamond-hunter':
      return 'mode-diamond-hunter'
    default:
      if (route.name?.toString().startsWith('theory-endings')) return 'mode-theory'
      if (route.name?.toString().startsWith('practical-chess')) return 'mode-practical'
      return 'mode-default'
  }
})
</script>

<template>
  <div class="top-info-panel-container" :class="containerClass">
    <!-- Таймер для Торнадо -->
    <!-- Таймер для Торнадо -->
    <div v-if="route.name === 'tornado'" class="timer-container">
      <!-- 1. Session Theme -->
      <div class="session-theme-label">
        {{ themeTranslation }}
      </div>

      <!-- timer center -->
      <div class="tornado-timer">
        {{ formattedTimer }}
      </div>

      <!-- 3. Session Rating -->
      <div class="session-rating-group">
        <n-icon color="#18a058" size="24">
          <TrendingUpOutline />
        </n-icon>
        <span class="session-rating-value">
          {{ tornadoStore.sessionRating }}
        </span>
      </div>
    </div>

    <!-- Finish Him Mode -->
    <div
      v-else-if="route.name?.toString().startsWith('finish-him') && activePuzzle"
      class="finish-him-info"
    >
      <n-tag
        v-if="displayTask.badges[0]"
        :type="displayTask.badges[0].type"
        size="small"
        round
        :bordered="false"
        class="difficulty-tag"
      >
        {{ displayTask.badges[0].text }}
      </n-tag>

      <span v-if="displayTask.footerTags[0]" class="subcategory-text">
        {{ displayTask.footerTags[0] }}
      </span>

      <div class="rating-group">
        <n-icon color="#18a058" size="20">
          <TrendingUpOutline />
        </n-icon>
        <span class="rating-value">{{ displayTask.header.value }}</span>
      </div>
    </div>

    <!-- Theory Endings Mode -->
    <div
      v-else-if="route.name?.toString().startsWith('theory-endings') && activePuzzle"
      class="theory-info"
    >
      <n-tag
        v-if="displayTask.badges[0]"
        :type="displayTask.badges[0].type"
        size="small"
        round
        :bordered="false"
        class="difficulty-tag"
      >
        {{ displayTask.badges[0].text }}
      </n-tag>

      <div class="puzzle-title-label">
        {{ themeTranslation }}
      </div>

      <div class="objective-group">
        <n-icon :color="displayTask.header.color === 'warning' ? '#f0a020' : '#2080f0'" size="24">
          <FlashOutline />
        </n-icon>
        <span class="objective-value" :class="displayTask.header.color">
          {{ displayTask.header.value }}
        </span>
      </div>
    </div>

    <!-- Practical Chess Mode -->
    <div
      v-else-if="route.name?.toString().startsWith('practical-chess') && activePuzzle"
      class="practical-info"
    >
      <n-tag
        v-if="displayTask.badges[0]"
        :type="displayTask.badges[0].type"
        size="small"
        round
        :bordered="false"
        class="difficulty-tag"
      >
        {{ displayTask.badges[0].text }}
      </n-tag>

      <div class="puzzle-title-label">
        {{ themeTranslation }}
      </div>

      <div class="evaluation-group">
        <n-icon color="#2080f0" size="24">
          <BarChartOutline />
        </n-icon>
        <span class="evaluation-value">
          {{ isYouMoveHidden ? '??' : displayTask.header.value }}
        </span>
      </div>
    </div>

    <!-- Diamond Hunter Mode -->
    <div
      v-else-if="route.name === 'diamond-hunter'"
      class="diamond-hunter-info"
    >
      <div class="hunter-status">
        <span v-if="diamondHunterStore.state === 'HUNTING'">
          {{ t('diamondHunter.status.hunting') || 'HUNTING...' }}
        </span>
        <span v-else-if="diamondHunterStore.state === 'SOLVING'" class="pulsate-red">
          {{ t('diamondHunter.status.punish') || 'PUNISH BLUNDER!' }}
        </span>
        <span v-else-if="diamondHunterStore.state === 'SAVING'" class="pulsate-blue">
          {{ t('diamondHunter.status.secure') || 'SECURE DIAMOND!' }}
        </span>
         <span v-else-if="diamondHunterStore.state === 'REWARD'" style="color: #00C853">
          {{ t('diamondHunter.status.found') || 'DIAMOND FOUND!' }}
        </span>
        <span v-else>{{ t('diamondHunter.status.idle') || 'IDLE' }}</span>
      </div>



      <div class="hunter-stats-group">
        <div class="stat-item">
          <n-icon color="#9C27B0" size="24">
            <DiamondOutline />
          </n-icon>
          <span class="stat-value diamond-text">{{ diamondHunterStore.totalDiamonds }}</span>
        </div>
        <div class="stat-item">
          <n-icon color="#00C853" size="24">
            <FlashOutline />
          </n-icon>
          <span class="stat-value brilliant-text">{{ diamondHunterStore.totalBrilliants }}</span>
        </div>
      </div>
    </div>

    <!-- Общий заголовок для других режимов -->
    <div
      v-else-if="activeThemeKey !== 'auto'"
      class="puzzle-title-container"
    >
      <span class="puzzle-title-label">
        {{ themeTranslation }}
      </span>
    </div>

    <div
      v-if="
        ['sandbox', 'sandbox-with-engine', 'sandbox-with-engine-and-color'].includes(
          route.name as string,
        )
      "
      class="engine-selector-container"
    >
      <img src="/buttons/robot.svg" alt="Select Engine" class="robot-icon" />
      <EngineSelector />
    </div>
  </div>
</template>

<style scoped>
.top-info-panel-container {
  width: 100%;
  height: 100%;
  display: flex; /* Changed from Grid to Flex for better centering/distribution */
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  box-sizing: border-box;
  position: relative;
}

/* --- TORNADO MODE --- */
.timer-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 600px; /* Constrain width on large screens */
}

/* Group Info and Rating together on the left */
.session-theme-label {
  font-size: var(--font-size-large);
  color: var(--color-text-link);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 100px;
  flex: 1;
}

.tornado-timer {
  font-size: var(--font-size-xlarge);
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent-warning);
  flex: 0 0 auto;
  text-align: center;
}

.session-rating-group {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex: 1;
}

.session-rating-value {
  font-size: var(--font-size-xlarge);
  color: var(--color-accent-success);
  font-weight: bold;
  font-family: monospace;
  color: var(--color-neon-orange);
}

/* --- FINISH HIM MODE --- */
.mode-finish-him.top-info-panel-container {
  padding: 0 15px;
}

.finish-him-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.subcategory-text {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.rating-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rating-icon {
  display: flex;
  align-items: center;
}

.rating-value {
  font-family: monospace;
  font-weight: 700;
  font-size: var(--font-size-large);
  color: #18a058; /* Naive UI Success color */
}

.difficulty-tag {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
}

/* --- THEORY MODE --- */
.mode-theory.top-info-panel-container {
  padding: 0 15px; /* Added some padding for space-between */
}

.theory-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.objective-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.objective-value {
  font-size: var(--font-size-large);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.objective-value.warning {
  color: #f0a020; /* Draw/Warn color */
}

.objective-value.info {
  color: #2080f0; /* Info color */
}

/* --- PRACTICAL MODE --- */
.mode-practical.top-info-panel-container {
  padding: 0 15px;
}

.practical-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.evaluation-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.evaluation-value {
  font-size: var(--font-size-large);
  font-weight: 800;
  font-family: monospace;
  color: #2080f0;
}

/* --- DIAMOND HUNTER MODE --- */
.mode-diamond-hunter.top-info-panel-container {
  padding: 0 15px;
}

.diamond-hunter-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.hunter-status {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-link);
  min-width: 150px;
}

.diamond-title {
  color: #00C853 !important;
}

.hunter-stats-group {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 150px;
  justify-content: flex-end;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-value {
  font-size: var(--font-size-xlarge);
  font-weight: 800;
  font-family: monospace;
}

.diamond-text {
  color: #9C27B0;
}

.brilliant-text {
  color: #00C853;
}

.pulsate-red {
  color: #ff5252;
  animation: pulsate 1.5s infinite;
}

.pulsate-blue {
  color: #448AFF;
  animation: pulsate 1.5s infinite;
}

@keyframes pulsate {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* --- OTHER MODES --- */
.puzzle-title-container {
  flex: 1;
  display: flex;
  justify-content: center;
}

.puzzle-title-label {
  font-size: var(--font-size-large);
  font-weight: 800;
  color: var(--color-accent-primary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.engine-selector-container {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.robot-icon {
  width: 24px;
  height: 24px;
}

/* --- MOBILE ADAPTATION --- */
@media (orientation: portrait) {
  .top-info-panel-container {
    padding: 0 5px;
  }

  /* Tornado: Compact Row */
  .timer-container {
    justify-content: space-between;
  }

  .tornado-timer, .session-rating-value {
    font-size: 1.5rem; /* Slightly smaller but still prominent */
  }

  .tornado-info-left {
    max-width: 60%; /* Prevent overlapping timer */
  }

  .session-rating-label {
    font-size: 1rem;
  }

  .session-theme-label {
    font-size: var(--font-size-base);
    max-width: 150px;
  }

  .engine-selector-container {
    position: relative; /* On mobile, let it flow or be placed specifically */
    right: auto;
  }
}
</style>
