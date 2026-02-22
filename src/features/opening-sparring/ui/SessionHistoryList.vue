<script setup lang="ts">
import { computed, h, type CSSProperties } from 'vue'
import { NDataTable, NText, NDivider, type DataTableColumns } from 'naive-ui'
import { useOpeningSparringStore } from '@/features/opening-sparring'
import { type SessionMove } from '@/shared/types/openingSparring.types'
import PlayoutAnalysisTable from './PlayoutAnalysisTable.vue'

const openingStore = useOpeningSparringStore()

interface MovePair {
  number: number
  white: SessionMove | null
  black: SessionMove | null
}

const theoryMoves = computed(() => openingStore.sessionHistory.filter(m => m.phase === 'theory'))
const hasPlayout = computed(() => openingStore.sessionHistory.some(m => m.phase === 'playout'))

const movePairs = computed<MovePair[]>(() => {
  const history = theoryMoves.value
  const pairs: MovePair[] = []
  
  for (let i = 0; i < history.length; i += 2) {
    const white = history[i] || null
    const black = history[i + 1] || null
    
    pairs.push({
      number: Math.floor(i / 2) + 1,
      white,
      black
    })
  }
  return pairs
})

// Хелпер для рендера ячеек
const renderMove = (row: MovePair, color: 'white' | 'black') => {
    const move = row[color]
    if (!move) return null
    
    // Calculate index in GLOBAL history
    const index = openingStore.sessionHistory.indexOf(move)
    
    const isReview = openingStore.isReviewMode
    const isActive = isReview && openingStore.reviewMoveIndex === index
    
    const style: CSSProperties = {
        cursor: isReview ? 'pointer' : 'default',
        padding: '2px 6px',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
        display: 'inline-block',
        minWidth: '36px',
        textAlign: 'center'
    }
    
    if (isActive) {
        style.backgroundColor = 'var(--color-accent)'
        style.color = '#fff'
        style.fontWeight = 'bold'
    }

    return h(
        'div',
        {
            style,
            onClick: isReview ? () => openingStore.setReviewMove(index) : undefined,
            class: isReview ? 'review-move' : ''
        },
        [
            h(NText, { 
                strong: true, 
                style: { color: isActive ? '#fff' : undefined }
            }, { default: () => move.san || move.moveUci })
        ]
    )
}

const renderStat = (row: MovePair, color: 'white' | 'black', stat: 'acc' | 'win' | 'rat') => {
    const move = row[color]
    if (!move) return h(NText, { depth: 3 }, { default: () => '-' })

    let val: string | number = '-'
    let style = {}
    
    if (stat === 'acc') {
        const acc = Math.round(move.accuracy || move.popularity || 0)
        val = `${acc}%`
        if (acc >= 80) style = { color: '#4caf50', fontWeight: 'bold' }
        else if (acc >= 50) style = { color: '#ff9800', fontWeight: 'bold' }
        else style = { color: '#f44336', fontWeight: 'bold' }
    } else if (stat === 'win') {
        val = `${Math.round(move.winRate || 0)}%`
        style = { color: '#aaa' }
    } else if (stat === 'rat') {
        val = Math.round(move.rating || 0)
        if (val === 0) val = '-'
        style = { color: '#aaa' }
    }
    
    return h('span', { style: { fontSize: '11px', ...style } }, val)
}

const columns = computed<DataTableColumns<MovePair>>(() => [
  {
    title: '#',
    key: 'number',
    width: 30,
    align: 'center',
    fixed: 'left',
    render: (row) => h(NText, { depth: 3, style: { fontSize: '11px' } }, { default: () => `${row.number}.` })
  },
  {
    title: 'White',
    key: 'whiteGroup',
    align: 'center',
    children: [
        { title: 'Move', key: 'w_move', width: 50, render: (row) => renderMove(row, 'white') },
        { title: 'Acc', key: 'w_acc', width: 40, align: 'center', render: (row) => renderStat(row, 'white', 'acc') },
        { title: 'Win', key: 'w_win', width: 40, align: 'center', render: (row) => renderStat(row, 'white', 'win') },
        { title: 'Rat', key: 'w_rat', width: 45, align: 'center', render: (row) => renderStat(row, 'white', 'rat') }
    ]
  },
  {
    title: 'Black',
    key: 'blackGroup',
    align: 'center',
    children: [
        { title: 'Move', key: 'b_move', width: 50, render: (row) => renderMove(row, 'black') },
        { title: 'Acc', key: 'b_acc', width: 40, align: 'center', render: (row) => renderStat(row, 'black', 'acc') },
        { title: 'Win', key: 'b_win', width: 40, align: 'center', render: (row) => renderStat(row, 'black', 'win') },
        { title: 'Rat', key: 'b_rat', width: 45, align: 'center', render: (row) => renderStat(row, 'black', 'rat') }
    ]
  }
])

</script>

<template>
  <div class="session-history-container">
    <div class="history-header">
        <h3>Session History</h3>
    </div>
    
    <div class="table-scroll-area">
        <n-data-table
          v-if="movePairs.length > 0"
          :columns="columns"
          :data="movePairs"
          :pagination="false"
          :bordered="false"
          size="small"
          class="history-table"
        />

        <div v-if="hasPlayout" class="playout-divider-container">
             <n-divider title-placement="center" class="playout-divider">
                <span class="divider-text">Playout Phase</span>
             </n-divider>
        </div>

        <PlayoutAnalysisTable v-if="hasPlayout" />
    </div>
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
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    
    h3 {
        margin: 0;
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--color-text-primary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
}

.table-scroll-area {
    flex: 1;
    overflow-y: auto;
    
    &::-webkit-scrollbar {
        width: 6px;
    }
    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
    }
}

.playout-divider-container {
    padding: 0 12px;
}

.playout-divider {
    margin: 12px 0 8px 0;
    --n-title-text-color: var(--color-accent) !important;
    --n-color: rgba(255, 255, 255, 0.1) !important;
}

.divider-text {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-accent);
}

:deep(.history-table) {
  background: transparent;

  .n-data-table-td {
    background-color: transparent;
    padding: 4px 4px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 12px;
  }

  .n-data-table-th {
    background-color: rgba(255, 255, 255, 0.05); /* Чуть светлее для заголовка */
    font-size: 10px;
    padding: 4px 4px !important;
    font-weight: bold;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    position: sticky;
    top: 0;
    z-index: 2; /* Увеличил z-index для сгруппированных заголовков */
    text-align: center;
  }
  
  /* Разделитель между группами белых и черных */
  .n-data-table-th[colspan="4"] {
     border-bottom: 1px solid rgba(255,255,255,0.1);
  }
}
</style>


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
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    
    h3 {
        margin: 0;
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--color-text-primary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
}

.table-scroll-area {
    flex: 1;
    overflow-y: auto;
    
    &::-webkit-scrollbar {
        width: 6px;
    }
    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
    }
}

:deep(.history-table) {
  background: transparent;

  .n-data-table-td {
    background-color: transparent;
    padding: 4px 4px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 12px;
  }

  .n-data-table-th {
    background-color: rgba(255, 255, 255, 0.05); /* Чуть светлее для заголовка */
    font-size: 10px;
    padding: 4px 4px !important;
    font-weight: bold;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    position: sticky;
    top: 0;
    z-index: 2; /* Увеличил z-index для сгруппированных заголовков */
    text-align: center;
  }
  
  /* Разделитель между группами белых и черных */
  .n-data-table-th[colspan="4"] {
     border-bottom: 1px solid rgba(255,255,255,0.1);
  }
}
</style>
