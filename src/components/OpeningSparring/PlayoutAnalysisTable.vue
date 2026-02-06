<script setup lang="ts">
import { computed, h } from 'vue'
import { 
    NDataTable, NText, NTag, NTooltip, NPopover, NIcon, 
    type DataTableColumns 
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

const playoutMoves = computed(() => {
    return openingStore.sessionHistory.filter(m => m.phase === 'playout')
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

const renderEval = (move: SessionMove) => {
    const ev = move.evaluation
    if (!ev) return h(NText, { depth: 3 }, { default: () => '-' })
    
    const cp = ev.score_cp
    const val = (cp / 100).toFixed(1)
    const displayVal = cp > 0 ? `+${val}` : val
    
    let color = '#aaa'
    if (cp > 150) color = '#4caf50'
    else if (cp < -150) color = '#f44336'
    
    return h('div', { 
        style: { 
            fontWeight: 'bold', 
            color, 
            background: 'rgba(255,255,255,0.05)',
            padding: '2px 6px',
            borderRadius: '4px',
            textAlign: 'center',
            minWidth: '45px'
        } 
    }, displayVal)
}

const renderThreat = (move: SessionMove) => {
    if (!move.threats || move.threats.threat_severity_score === 0) return null
    
    const severity = move.threats.threat_severity_score
    let color = '#ffeb3b'
    if (severity > 500) color = '#f44336'
    else if (severity > 200) color = '#ff9800'
    
    return h(NTooltip, { trigger: 'hover' }, {
        trigger: () => h(NIcon, { 
            color, 
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
    })
}

const renderFeatures = (move: SessionMove) => {
    const features = move.features
    if (!features) return null
    
    const icons = []
    
    if (features.tactics.hanging_pieces.length > 0) {
        icons.push(h(NTooltip, {}, {
            trigger: () => h(NIcon, { color: '#ff9800' }, { default: () => h(ExtensionPuzzleOutline) }),
            default: () => `Hanging: ${features.tactics.hanging_pieces.join(', ')}`
        }))
    }
    
    if (!features.king_safety.is_safe_heuristic) {
        icons.push(h(NTooltip, {}, {
            trigger: () => h(NIcon, { color: '#f44336' }, { default: () => h(WarningOutline) }),
            default: () => `King safety warning at ${features.king_safety.square}`
        }))
    }

    if (move.evaluation?.best_move_motifs?.includes('fork')) {
        icons.push(h(NTooltip, {}, {
            trigger: () => h(NIcon, { color: '#2196f3' }, { default: () => h(FlashOutline) }),
            default: () => 'Tactical fork motif'
        }))
    }
    
    return h('div', { style: { display: 'flex', gap: '4px' } }, icons)
}

const columns: DataTableColumns<SessionMove> = [
  {
    title: '#',
    key: 'num',
    width: 40,
    render: (_, index) => {
        // Find global index
        const globalIndex = openingStore.sessionHistory.findIndex(m => m === playoutMoves.value[index])
        const moveNum = Math.floor(globalIndex / 2) + 1
        const side = globalIndex % 2 === 0 ? '.' : '...'
        return h(NText, { depth: 3 }, { default: () => `${moveNum}${side}` })
    }
  },
  {
    title: 'Move',
    key: 'move',
    width: 80,
    render: (row) => {
        const globalIndex = openingStore.sessionHistory.findIndex(m => m === row)
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
                color: isActive ? '#fff' : 'inherit'
            },
            onClick: () => openingStore.setReviewMove(globalIndex)
        }, [
            h(NText, { strong: true, style: { color: isActive ? '#fff' : 'inherit' } }, { default: () => row.san }),
            row.quality ? h(NTag, { 
                size: 'small', 
                round: true, 
                bordered: false,
                style: { 
                    backgroundColor: getQualityColor(row.quality), 
                    color: '#000', 
                    fontWeight: '800',
                    fontSize: '10px',
                    height: '16px',
                    padding: '0 4px',
                    lineHeight: '16px'
                } 
            }, { default: () => getQualityText(row.quality) }) : null
        ])
    }
  },
  {
    title: 'Eval',
    key: 'eval',
    width: 60,
    align: 'center',
    render: (row) => renderEval(row)
  },
  {
    title: 'Best',
    key: 'best',
    width: 60,
    render: (row) => {
        if (!row.evaluation || row.san === row.evaluation.best_move_san) return h(NIcon, { color: '#4caf50' }, { default: () => h(ShieldCheckmarkOutline) })
        return h(NText, { 
            style: { cursor: 'pointer', fontSize: '12px', borderBottom: '1px dashed #666' },
            onClick: (e: MouseEvent) => {
                e.stopPropagation()
                const best = row.evaluation?.best_move
                if (best) {
                    boardStore.setDrawableShapes([{
                        orig: best.slice(0, 2) as Key,
                        dest: best.slice(2, 4) as Key,
                        brush: 'green'
                    }])
                }
            }
        }, { default: () => row.evaluation?.best_move_san })
    }
  },
  {
    title: 'Features',
    key: 'features',
    width: 70,
    render: (row) => renderFeatures(row)
  },
  {
    title: 'Thr',
    key: 'threat',
    width: 40,
    align: 'center',
    render: (row) => renderThreat(row)
  },
  {
    title: 'PV',
    key: 'pv',
    width: 40,
    align: 'center',
    render: (row) => {
        if (!row.evaluation?.pv_san) return null
        return h(NPopover, { trigger: 'hover', placement: 'left', style: { maxWidth: '300px' } }, {
            trigger: () => h(NIcon, { style: { cursor: 'help' } }, { default: () => h(EyeOutline) }),
            default: () => h('div', { style: { fontSize: '12px', lineHeight: '1.5' } }, row.evaluation?.pv_san)
        })
    }
  }
]
</script>

<template>
  <div class="playout-analysis-table">
    <n-data-table
      :columns="columns"
      :data="playoutMoves"
      :pagination="false"
      :bordered="false"
      size="small"
      class="analysis-table"
      :row-props="(row: SessionMove) => ({
          style: { cursor: 'pointer' },
          onClick: () => openingStore.setReviewMove(openingStore.sessionHistory.indexOf(row))
      })"
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
    padding: 6px 4px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .n-data-table-th {
    background-color: rgba(255, 255, 255, 0.03);
    font-size: 10px;
    padding: 4px 4px !important;
    font-weight: bold;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }
}
</style>
