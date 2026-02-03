<script setup lang="ts">
import { computed, h } from 'vue'
import { NDataTable, NText, NTag, type DataTableColumns } from 'naive-ui'
import { useOpeningSparringStore } from '../../stores/openingSparring.store'
import { type SessionMove } from '../../types/openingSparring.types'

const openingStore = useOpeningSparringStore()

const columns = computed<DataTableColumns<SessionMove>>(() => [
  {
    title: '#',
    key: 'index',
    width: 40,
    render: (_, index) => {
        const moveNum = Math.floor(index / 2) + 1
        return index % 2 === 0 ? `${moveNum}.` : ''
    }
  },
  {
    title: 'Move',
    key: 'san',
    width: 80,
    render: (row) => h(NText, { strong: true }, { default: () => row.san || row.moveUci })
  },
  {
    title: 'Acc',
    key: 'accuracy',
    width: 60,
    align: 'center',
    render: (row) => {
        if (row.phase === 'playout') return h(NText, { depth: 3 }, { default: () => '-' })
        const acc = Math.round(row.accuracy || row.popularity || 0)
        let type: 'success' | 'warning' | 'error' | 'default' = 'default'
        if (acc >= 80) type = 'success'
        else if (acc >= 50) type = 'warning'
        else type = 'error'
        
        return h(NText, { type, strong: true }, { default: () => `${acc}%` })
    }
  },
  {
    title: 'Perf',
    key: 'rating',
    width: 60,
    align: 'right',
    render: (row) => {
        if (row.phase === 'playout') return h(NText, { depth: 3 }, { default: () => '-' })
        return h(NText, { depth: 2 }, { default: () => Math.round(row.rating || 0).toString() })
    }
  },
  {
    title: 'Phase',
    key: 'phase',
    width: 70,
    align: 'right',
    render: (row) => {
        if (row.phase === 'playout') {
            return h(NTag, { size: 'small', type: 'info', bordered: false }, { default: () => 'GAME' })
        }
        return h(NText, { depth: 3, style: { fontSize: '10px' } }, { default: () => 'BOOK' })
    }
  }
])

const history = computed(() => openingStore.sessionHistory)

</script>

<template>
  <div class="session-history-container">
    <div class="history-header">
        <h3>Session History</h3>
    </div>
    <n-data-table
      :columns="columns"
      :data="history"
      :pagination="false"
      :bordered="false"
      size="small"
      class="history-table"
      :row-class-name="(row) => row.phase === 'playout' ? 'playout-row' : ''"
    />
  </div>
</template>

<style scoped lang="scss">
.session-history-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.history-header {
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--color-border);
    
    h3 {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--color-text-primary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
}

:deep(.history-table) {
  flex: 1;
  background: transparent;

  .n-data-table-wrapper {
      border-radius: 0;
  }

  .n-data-table-td {
    background-color: transparent;
    padding: 8px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .n-data-table-th {
    background-color: rgba(255, 255, 255, 0.02);
    font-size: 0.75rem;
    padding: 8px !important;
  }
  
  .playout-row .n-data-table-td {
      background-color: rgba(33, 150, 243, 0.05) !important;
  }
}
</style>
