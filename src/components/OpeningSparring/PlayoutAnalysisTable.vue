<script setup lang="ts">
import { computed, h } from 'vue'
import { 
    NDataTable, NText, NTag, NTooltip, NPopover, NIcon, 
    type DataTableColumns,
    type DataTableBaseColumn
} from 'naive-ui'
import { 
    FlameOutline, 
    EyeOutline, 
    ShieldCheckmarkOutline,
    WarningOutline,
    ExtensionPuzzleOutline,
    FlashOutline
} from '@vicons/ionicons5'
import { useOpeningSparringStore } from '../../stores/openingSparring.store'
import { useBoardStore } from '../../stores/board.store'
import { type SessionMove } from '../../types/openingSparring.types'
import { type Key } from '@lichess-org/chessground/types'

const openingStore = useOpeningSparringStore()
const boardStore = useBoardStore()

interface PlayoutPair {
    number: number
    white: SessionMove | null
    black: SessionMove | null
}

const playoutPairs = computed(() => {
    const allPlayout = openingStore.sessionHistory.filter(m => m.phase === 'playout')
    if (allPlayout.length === 0) return []
    
    // We need to know where playout started in the global history to get the correct starting move number
    const firstPlayoutIndex = openingStore.sessionHistory.findIndex(m => m.phase === 'playout')
    
    const pairs: PlayoutPair[] = []
    
    // If playout started on a Black move, the first pair will have white as null
    let i = 0
    if (firstPlayoutIndex % 2 !== 0) {
        pairs.push({
            number: Math.floor(firstPlayoutIndex / 2) + 1,
            white: null,
            black: allPlayout[0] || null
        })
        i = 1
    }
    
    for (; i < allPlayout.length; i += 2) {
        const white = allPlayout[i] || null
        const black = allPlayout[i + 1] || null
        const globalIndex = openingStore.sessionHistory.indexOf(white || black!)
        
        pairs.push({
            number: Math.floor(globalIndex / 2) + 1,
            white,
            black
        })
    }
    
    return pairs
})

const getQualityColor = (quality?: string) => {
    switch (quality) {
        case 'blunder': return '#f44336'
        case 'mistake': return '#ff9800'
        case 'inaccuracy': return '#ffeb3b'
        case 'good': return '#4caf50'
        case 'best': return '#2196f3'
        case 'brilliant': return '#9c27b0'
        default: return 'transparent'
    }
}

const getQualityText = (quality?: string) => {
    switch (quality) {
        case 'blunder': return '??'
        case 'mistake': return '?'
        case 'inaccuracy': return '?!'
        case 'best': return '!'
        case 'brilliant': return '!!'
        default: return ''
    }
}

const renderMoveCell = (move: SessionMove | null) => {
    if (!move) return null
    const globalIndex = openingStore.sessionHistory.indexOf(move)
    const isActive = openingStore.isReviewMode && openingStore.reviewMoveIndex === globalIndex
    
    return h('div', { 
        style: { 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            cursor: 'pointer',
            background: isActive ? 'var(--color-accent)' : 'transparent',
            padding: '2px 4px',
            borderRadius: '4px',
            color: isActive ? '#fff' : 'inherit',
            justifyContent: 'center'
        },
        onClick: () => openingStore.setReviewMove(globalIndex)
    }, [
        h(NText, { strong: true, style: { color: isActive ? '#fff' : 'inherit', fontSize: '13px' } }, { default: () => move.san }),
        move.quality ? h(NTag, { 
            size: 'small', 
            round: true, 
            bordered: false,
            style: { 
                backgroundColor: getQualityColor(move.quality), 
                color: '#000', 
                fontWeight: '800',
                fontSize: '9px',
                height: '14px',
                padding: '0 3px',
                lineHeight: '14px'
            } 
        }, { default: () => getQualityText(move.quality) }) : null
    ])
}

const renderEval = (move: SessionMove | null) => {
    if (!move?.evaluation) return h(NText, { depth: 3 }, { default: () => '-' })
    
    const cp = move.evaluation.score_cp
    const val = (cp / 100).toFixed(1)
    const displayVal = cp > 0 ? `+${val}` : val
    
    let color = '#aaa'
    if (cp > 150) color = '#4caf50'
    else if (cp < -150) color = '#f44336'
    
    return h('div', { 
        style: { 
            fontWeight: 'bold', 
            color, 
            fontSize: '11px',
            textAlign: 'center'
        } 
    }, displayVal)
}

const renderAnalysisIcons = (move: SessionMove | null) => {
    if (!move) return null
    const icons = []

    // Threat
    if (move.threats && move.threats.threat_severity_score > 0) {
        const severity = move.threats.threat_severity_score
        let color = '#ffeb3b'
        if (severity > 500) color = '#f44336'
        else if (severity > 200) color = '#ff9800'

        icons.push(h(NTooltip, { trigger: 'hover' }, {
            trigger: () => h(NIcon, { 
                color, 
                size: 14,
                style: { cursor: 'pointer' },
                onClick: (e: MouseEvent) => {
                    e.stopPropagation()
                    if (move.threats) {
                        boardStore.setDrawableShapes([{
                            orig: move.threats.opponent_threat_move.slice(0, 2) as Key,
                            dest: move.threats.opponent_threat_move.slice(2, 4) as Key,
                            brush: 'red'
                        }])
                    }
                }
            }, { default: () => h(FlameOutline) }),
            default: () => move.threats?.threat_description || `Threat: ${move.threats?.opponent_threat_san}`
        }))
    }

    // Best Move Suggestion (if user missed it)
    if (move.evaluation && move.san !== move.evaluation.best_move_san) {
        icons.push(h(NTooltip, {}, {
            trigger: () => h(NIcon, { 
                color: '#2196f3', 
                size: 14, 
                style: { cursor: 'pointer' },
                onClick: (e: MouseEvent) => {
                    e.stopPropagation()
                    const best = move.evaluation?.best_move
                    if (best) {
                        boardStore.setDrawableShapes([{
                            orig: best.slice(0, 2) as Key,
                            dest: best.slice(2, 4) as Key,
                            brush: 'green'
                        }])
                    }
                }
            }, { default: () => h(ShieldCheckmarkOutline) }),
            default: () => `Best: ${move.evaluation?.best_move_san}`
        }))
    }

    // PV Eye
    if (move.evaluation?.pv_san) {
        icons.push(h(NPopover, { trigger: 'hover', placement: 'top', style: { maxWidth: '300px' } }, {
            trigger: () => h(NIcon, { size: 14, style: { cursor: 'help', color: '#888' } }, { default: () => h(EyeOutline) }),
            default: () => h('div', { style: { fontSize: '11px', lineHeight: '1.4' } }, move.evaluation?.pv_san)
        }))
    }

    return h('div', { style: { display: 'flex', gap: '3px', justifyContent: 'center', alignItems: 'center' } }, icons)
}

const renderFeatures = (move: SessionMove | null) => {
    if (!move?.features) return null
    const features = move.features
    const icons = []
    
    if (features.tactics.hanging_pieces.length > 0) {
        icons.push(h(NTooltip, {}, {
            trigger: () => h(NIcon, { color: '#ff9800', size: 12 }, { default: () => h(ExtensionPuzzleOutline) }),
            default: () => `Hanging: ${features.tactics.hanging_pieces.join(', ')}`
        }))
    }
    
    if (!features.king_safety.is_safe_heuristic) {
        icons.push(h(NIcon, { color: '#f44336', size: 12 }, { default: () => h(WarningOutline) }))
    }

    if (move.evaluation?.best_move_motifs?.includes('fork')) {
        icons.push(h(NIcon, { color: '#2196f3', size: 12 }, { default: () => h(FlashOutline) }))
    }
    
    return h('div', { style: { display: 'flex', gap: '2px', justifyContent: 'center' } }, icons)
}

const createColorColumns = (side: 'white' | 'black'): DataTableBaseColumn<PlayoutPair>[] => [
    { title: 'Move', key: `${side}_move`, width: 65, align: 'center', render: (row: PlayoutPair) => renderMoveCell(row[side]) },
    { title: 'Eval', key: `${side}_eval`, width: 45, align: 'center', render: (row: PlayoutPair) => renderEval(row[side]) },
    { title: 'Anlys', key: `${side}_anlys`, width: 60, align: 'center', render: (row: PlayoutPair) => renderAnalysisIcons(row[side]) },
    { title: 'Feat', key: `${side}_feat`, width: 45, align: 'center', render: (row: PlayoutPair) => renderFeatures(row[side]) }
]

const columns = computed<DataTableColumns<PlayoutPair>>(() => [
  {
    title: '#',
    key: 'number',
    width: 35,
    align: 'center',
    render: (row) => h(NText, { depth: 3, style: { fontSize: '11px' } }, { default: () => `${row.number}.` })
  },
  {
    title: 'White',
    key: 'whiteGroup',
    align: 'center',
    children: createColorColumns('white')
  },
  {
    title: 'Black',
    key: 'blackGroup',
    align: 'center',
    children: createColorColumns('black')
  }
])
</script>

<template>
  <div class="playout-analysis-table">
    <n-data-table
      :columns="columns"
      :data="playoutPairs"
      :pagination="false"
      :bordered="false"
      size="small"
      class="analysis-table"
    />
  </div>
</template>

<style scoped lang="scss">
.playout-analysis-table {
    background: transparent;
}

:deep(.analysis-table) {
  background: transparent;

  .n-data-table-td {
    background-color: transparent;
    padding: 4px 2px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .n-data-table-th {
    background-color: rgba(255, 255, 255, 0.03);
    font-size: 10px;
    padding: 4px 2px !important;
    font-weight: bold;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    text-align: center;
  }

  /* Разделитель между группами */
  .n-data-table-th[colspan="4"] {
     border-bottom: 1px solid rgba(255,255,255,0.1);
  }
}
</style>
