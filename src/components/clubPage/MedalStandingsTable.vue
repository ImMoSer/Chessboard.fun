<!-- src/components/clubPage/MedalStandingsTable.vue -->
<script setup lang="ts">
import { h, ref, computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DataTableColumns } from 'naive-ui'
import type { MedalsReportUser, Medals } from '../../types/api.types'

const { t } = useI18n()

const props = defineProps({
  report: {
    type: Object as PropType<{
      user_in_arena_medals: MedalsReportUser[]
      user_in_club_medals: MedalsReportUser[]
    }>,
    required: true,
  },
})

// Состояние переключателя (клубные медали по умолчанию)
const medalType = ref<'club' | 'arena'>('club')

// Хелпер для получения количества медалей из объекта Medals
const getMedalStats = (medals: Medals) => {
  const gold = medals.gold?.count || 0
  const silver = medals.silver?.count || 0
  const bronze = medals.bronze?.count || 0
  return { gold, silver, bronze, total: gold + silver + bronze }
}

const columns: DataTableColumns<MedalsReportUser> = [
  {
    title: t('clubPage.table.player'),
    key: 'username',
    render(row) {
      return h('a', {
        href: `https://lichess.org/@/${row.username}`,
        target: '_blank',
        style: { color: 'var(--color-text-link)', textDecoration: 'none' }
      }, row.username)
    }
  },
  {
    title: '🥇',
    key: 'gold',
    align: 'center',
    render(row) {
      return h('span', { class: 'medal-count gold' }, row.medals.gold?.count || 0)
    }
  },
  {
    title: '🥈',
    key: 'silver',
    align: 'center',
    render(row) {
      return h('span', { class: 'medal-count silver' }, row.medals.silver?.count || 0)
    }
  },
  {
    title: '🥉',
    key: 'bronze',
    align: 'center',
    render(row) {
      return h('span', { class: 'medal-count bronze' }, row.medals.bronze?.count || 0)
    }
  },
  {
    title: t('clubPage.table.totalMedals'),
    key: 'total',
    align: 'right',
    render(row) {
      const stats = getMedalStats(row.medals)
      return h('span', { style: { fontWeight: 'bold' } }, stats.total)
    }
  }
]

const displayData = computed(() => {
  const data = medalType.value === 'club' 
    ? props.report.user_in_club_medals 
    : props.report.user_in_arena_medals
  
  return [...data]
    .filter(item => getMedalStats(item.medals).total > 0)
    .sort((a, b) => getMedalStats(b.medals).total - getMedalStats(a.medals).total)
})
</script>

<template>
  <div class="medal-card">
    <div class="card-header">
      <div class="header-top">
        <h3 class="card-title">{{ t('clubPage.medals.title') }}</h3>
        <n-radio-group v-model:value="medalType" size="small" name="medalTypeGroup">
          <n-radio-button value="club">{{ t('clubPage.tabs.medals') }} (Club)</n-radio-button>
          <n-radio-button value="arena">Arenas</n-radio-button>
        </n-radio-group>
      </div>
    </div>
    <n-data-table
      :columns="columns"
      :data="displayData"
      :row-key="(row: MedalsReportUser) => row.username"
      striped
      class="medal-table"
      :max-height="500"
    />
  </div>
</template>

<style scoped>
.medal-card {
  background-color: var(--color-bg-tertiary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.card-header {
  background-color: var(--color-gold);
  padding: 12px 16px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.card-title {
  margin: 0;
  color: var(--color-text-dark);
  font-family: var(--font-family-primary);
  font-size: var(--font-size-xlarge);
}

.medal-count {
  font-weight: bold;
  font-size: var(--font-size-large);
}

.gold { color: var(--color-gold); }
.silver { color: var(--color-silver); }
.bronze { color: var(--color-bronze); }

.medal-table {
  --n-td-color-striped: var(--color-bg-secondary);
}

:deep(.n-data-table-th) {
  background-color: var(--color-bg-secondary) !important;
  font-family: var(--font-family-primary);
}

:deep(.n-data-table-td) {
  font-family: var(--font-family-primary);
}

@media (max-width: 600px) {
  .header-top {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>