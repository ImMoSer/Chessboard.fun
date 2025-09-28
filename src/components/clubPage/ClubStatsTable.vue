<!-- src/components/clubPage/ClubStatsTable.vue -->
<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TeamBattlePlayerSummary } from '../../types/api.types'

const { t } = useI18n()
const VISIBLE_COUNT_INCREMENT = 10

// --- PROPS ---
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  players: {
    type: Array as PropType<TeamBattlePlayerSummary[]>,
    required: true,
  },
  // Определяем колонки таблицы через props для гибкости
  columns: {
    type: Array as PropType<{ key: keyof TeamBattlePlayerSummary; label: string; class?: string }[]>,
    required: true,
  },
  // Ключ для сортировки
  sortKey: {
    type: String as PropType<keyof TeamBattlePlayerSummary>,
    required: true,
  },
  // Класс для цвета заголовка
  titleColorClass: {
    type: String,
    default: 'default-title-color',
  },
})

// --- LOCAL STATE ---
const visiblePlayerCount = ref(VISIBLE_COUNT_INCREMENT)

// --- COMPUTED ---
const sortedPlayers = computed(() => {
  // Создаем копию массива, чтобы не мутировать props
  return [...props.players].sort((a, b) => {
    const valA = a[props.sortKey]
    const valB = b[props.sortKey]

    // Обрабатываем вложенные объекты (для performance и rating)
    if (typeof valA === 'object' && valA !== null && 'avg' in valA) {
      return (valB as any).avg - (valA as any).avg
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return valB - valA
    }
    return 0
  })
})

const visiblePlayers = computed(() => {
  return sortedPlayers.value.slice(0, visiblePlayerCount.value)
})

const hasMorePlayers = computed(() => {
  return visiblePlayerCount.value < sortedPlayers.value.length
})

// --- METHODS ---
const showMore = () => {
  visiblePlayerCount.value += VISIBLE_COUNT_INCREMENT
}

const getFlairIconUrl = (flair?: string | null) => {
  if (!flair) return null
  return `https://lichess1.org/assets/flair/img/${flair}.webp`
}

// Рендерим ячейку с игроком (имя + иконка)
const renderPlayerCell = (player: TeamBattlePlayerSummary) => {
  const flairHtml = player.flair
    ? `<img src="${getFlairIconUrl(player.flair)}" alt="Flair" title="${player.flair
    }" class="club-page__flair-icon" />`
    : ''
  return `<a href="https://lichess.org/@/${player.lichess_id}" target="_blank">${player.username}</a>${flairHtml}`
}

// Получаем значение для любой ячейки
const getCellValue = (player: TeamBattlePlayerSummary, key: keyof TeamBattlePlayerSummary) => {
  const value = player[key]
  if (typeof value === 'object' && value !== null && 'avg' in value) {
    return (value as any).avg
  }
  return value
}
</script>

<template>
  <div class="club-page__table-container">
    <h3 class="club-page__table-title" :class="titleColorClass">{{ title }}</h3>
    <table class="club-page__table">
      <thead>
        <tr>
          <th class="text-center">#</th>
          <th v-for="col in columns" :key="col.key" :class="col.class || 'text-left'">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(player, index) in visiblePlayers" :key="player.lichess_id">
          <td class="text-center">{{ index + 1 }}</td>
          <td v-for="col in columns" :key="col.key" :class="col.class || 'text-left'">
            <span v-if="col.key === 'username'" v-html="renderPlayerCell(player)"></span>
            <span v-else>{{ getCellValue(player, col.key) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="hasMorePlayers" class="club-page__show-more-container">
      <button class="club-page__show-more-button" @click="showMore">
        {{ t('clubPage.button.showMore') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.club-page__table-container {
  padding: 0;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.club-page__table-title {
  font-size: var(--font-size-xlarge);
  color: var(--color-text-dark);
  margin: 0;
  padding: 10px 10px;
  border-bottom: 1px solid var(--color-border-hover);
}

/* Цветовые классы для заголовков */
.title-color-primary {
  background-color: var(--color-accent-primary);
}

.title-color-secondary {
  background-color: var(--color-accent-secondary);
}

.title-color-violet {
  background-color: var(--color-violett-lichess);
}

.default-title-color {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-default);
}

.club-page__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-base);
}

.club-page__table th,
.club-page__table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-default);
  white-space: nowrap;
}

.club-page__table .text-left {
  text-align: left;
}

.club-page__table .text-center {
  text-align: center;
}

.club-page__table .text-right {
  text-align: right;
}

.club-page__table thead th {
  background-color: var(--color-bg-secondary);
  font-weight: var(--font-weight-bold);
}

.club-page__table>tbody>tr:nth-child(odd) {
  background-color: var(--color-bg-tertiary);
}

.club-page__table>tbody>tr:nth-child(even) {
  background-color: var(--color-bg-secondary);
}

.club-page__table tbody tr:hover {
  background-color: var(--color-border-hover);
}

/* v-deep селектор для стилизации HTML, вставленного через v-html */
:deep(a) {
  color: var(--color-text-link);
  text-decoration: none;
}

:deep(a:hover) {
  text-decoration: underline;
}

:deep(.club-page__flair-icon) {
  height: 15px;
  vertical-align: -0.15em;
  margin-left: 6px;
}

.club-page__show-more-container {
  padding: 10px;
  text-align: center;
  background-color: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
}

.club-page__show-more-button {
  width: 100%;
  padding: 10px;
  background-color: var(--color-accent-primary);
  color: var(--color-text-on-accent);
  border: none;
  border-radius: var(--panel-border-radius);
  cursor: pointer;
  font-weight: var(--font-weight-bold);
  transition: background-color 0.2s ease;
}

.club-page__show-more-button:hover {
  background-color: var(--color-accent-primary-hover);
}

@media (orientation: portrait) {
  .club-page__table-title {
    font-size: var(--font-size-base);
    padding: 8px 10px;
  }

  .club-page__table,
  .club-page__show-more-button {
    font-size: var(--font-size-xsmall);
  }

  .club-page__table th,
  .club-page__table td {
    padding: 5px;
  }
}
</style>
