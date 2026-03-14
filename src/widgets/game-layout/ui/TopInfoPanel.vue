<!-- src/widgets/game-layout/TopInfoPanel.vue -->
<script setup lang="ts">
import { useGameStore } from '@/entities/game'
import {
    BarChartOutline,
    DiamondOutline,
    FitnessOutline,
    FlashOutline,
    PeopleOutline,
    TrendingUpOutline
} from '@vicons/ionicons5'
import { NIcon, NTag } from 'naive-ui'
import { computed, markRaw, type Component } from 'vue'
import { useTopInfo } from '../model/useTopInfo'

const { displayInfo } = useTopInfo()
const gameStore = useGameStore()

/**
 * Maps icon names from stores to actual v-icon components
 */
const iconMap: Record<string, Component> = {
  'trending-up': markRaw(TrendingUpOutline),
  'bar-chart': markRaw(BarChartOutline),
  'flash': markRaw(FlashOutline),
  'diamond': markRaw(DiamondOutline),
  'pieces': markRaw(PeopleOutline),
  'advantage': markRaw(TrendingUpOutline),
  'material': markRaw(FitnessOutline),
}

const getIcon = (name: string) => iconMap[name] || markRaw(FlashOutline)

const isValueHidden = computed(() => {
  // Hide eval in Practical Chess "materialEquality" during color selection
  if (displayInfo.value.customType === 'practical-chess' && 
      displayInfo.value.extra?.category === 'materialEquality' && 
      displayInfo.value.extra?.isWaiting) {
    return true
  }

  // Logic for hiding eval in Practical Chess "You move" phase
  return displayInfo.value.customType === 'puzzle' &&
         gameStore.gamePhase !== 'GAMEOVER' &&
         displayInfo.value.mainIcon === 'bar-chart' &&
         displayInfo.value.title.toLowerCase().includes('equality')
})
</script>

<template>
  <div
    class="top-info-panel-container"
    :class="[`mode-${displayInfo.customType || 'default'}`]"
  >
    <div class="generic-info-layout">
      <!-- Left: Badges & Secondary Info -->
      <div class="info-left">
        <div
          v-for="(badge, index) in displayInfo.badges"
          :key="index"
          class="badge-wrapper"
        >
          <n-tag
            :type="badge.type"
            size="small"
            round
            :bordered="false"
            class="difficulty-tag"
            :class="{ 'nag-tag': badge.count !== undefined }"
            :style="badge.color ? { backgroundColor: badge.color, color: '#000' } : {}"
          >
            {{ badge.text }}
          </n-tag>
          <span v-if="badge.count !== undefined" class="badge-count">x{{ badge.count }}</span>
        </div>
        <span v-if="displayInfo.secondaryText" class="secondary-text">
          {{ displayInfo.secondaryText }}
        </span>
      </div>

      <!-- Center: Title & Main Value -->
      <div class="info-center">
        <div class="info-title">{{ displayInfo.title }}</div>
        <div v-if="displayInfo.mainValue" class="main-display-group">
          <n-icon v-if="displayInfo.mainIcon" :color="displayInfo.mainColor" size="24">
            <component :is="getIcon(displayInfo.mainIcon)" />
          </n-icon>
          <span
            class="main-value"
            :style="{ color: displayInfo.mainColor }"
            :class="{ 'pulsate-main': displayInfo.customType === 'diamond-hunter' && (gameStore.gamePhase === 'PLAYING' || gameStore.gamePhase === 'LOADING') }"
          >
            {{ isValueHidden ? '??' : displayInfo.mainValue }}
          </span>
        </div>
      </div>

      <!-- Right: Stats List -->
      <div class="info-right">
        <div
          v-for="(stat, index) in displayInfo.stats"
          :key="index"
          class="stat-item"
        >
          <n-tooltip trigger="hover">
            <template #trigger>
              <div class="stat-trigger">
                <n-icon :color="stat.color || '#888'" size="20">
                  <component :is="getIcon(stat.icon)" />
                </n-icon>
                <span class="stat-value" :style="{ color: stat.color }">
                  {{ stat.value }}
                </span>
              </div>
            </template>
            {{ stat.label || '' }}
          </n-tooltip>
        </div>
      </div>
    </div>
  </div>


</template>

<style scoped>
.top-info-panel-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  box-sizing: border-box;
}

.generic-info-layout {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1000px;
  gap: 8px;
}

/* --- Left Section --- */
.info-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 100px;
}

.badge-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.difficulty-tag {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
}

.nag-tag {
  font-size: 14px;
  font-weight: 900;
  height: 22px;
  min-width: 24px;
  justify-content: center;
}

.badge-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  font-family: monospace;
}

.secondary-text {
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

/* --- Center Section --- */
.info-center {
  flex: 2;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.info-title {
  font-size: var(--font-size-base);
  color: var(--color-text-link);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.8;
  white-space: nowrap;
}

.main-display-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.main-value {
  font-size: var(--font-size-xlarge);
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
}

/* --- Right Section --- */
.info-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-width: 100px;
}

.stat-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: help;
}

.stat-value {
  font-size: var(--font-size-large);
  font-weight: 800;
  font-family: monospace;
}

/* --- Special Effects --- */
.mode-tornado .main-value {
  font-size: 2rem;
}

.pulsate-main {
  animation: pulsate 1.5s infinite;
}

@keyframes pulsate {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* --- Mobile Adaptation --- */
@media (max-width: 768px) {
  .top-info-panel-container {
    padding: 0 8px;
  }

  .info-left,
  .info-right {
    min-width: auto;
    gap: 4px;
  }

  .secondary-text,
  .info-title {
    display: none;
  }

  .info-right {
    gap: 6px;
  }

  .main-value {
    font-size: 1.1rem;
  }

  .badge-wrapper {
    gap: 2px;
  }

  .nag-tag {
    font-size: 11px;
    height: 18px;
    min-width: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .badge-count {
    font-size: 10px;
  }

  .difficulty-tag:not(.nag-tag) {
    font-size: 0;
    min-width: 8px;
    height: 8px;
    padding: 0;
  }
}
</style>
