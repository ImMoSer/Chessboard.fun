<script setup lang="ts">
import { useBoardStore } from '@/entities/game'
import { useOpeningSparringStore } from '@/features/opening-sparring'
import { type SessionMove } from '@/shared/types/openingSparring.types'
import { type Key } from '@lichess-org/chessground/types'
import {
    ExtensionPuzzleOutline,
    EyeOutline,
    FlameOutline,
    FlashOutline,
    ShieldCheckmarkOutline
} from '@vicons/ionicons5'
import {
    NDataTable,
    NIcon,
    NPopover,
    NTag,
    NText,
    NTooltip,
    type DataTableBaseColumn,
    type DataTableColumns
} from 'naive-ui'
import { computed, h } from 'vue'

const openingStore = useOpeningSparringStore()
const boardStore = useBoardStore()

interface PlayoutPair {
    number: number
    white: SessionMove | null
    black: SessionMove | null
}

const playoutPairs = computed(() => {
    const allPlayout = openingStore.sessionHistory.filter((m: SessionMove) => m.phase === 'playout')
    if (allPlayout.length === 0) return []

    const groups = new Map<number, { white: SessionMove | null, black: SessionMove | null }>()

    for (const move of allPlayout) {
        const num = move.moveNumber || 0
        if (!groups.has(num)) {
            groups.set(num, { white: null, black: null })
        }
        const pair = groups.get(num)!
        // If move.turn is 'w', it means it was White's move.
        // Wait, standard FEN "w" means "White to move".
        // In SessionMove, we derived `turn` from `fenBefore`.
        // If fenBefore had "w", then it was White's turn to move. Correct.
        if (move.turn === 'w') {
            pair.white = move
        } else {
            pair.black = move
        }
    }

    return Array.from(groups.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([num, pair]) => ({
            number: num,
            white: pair.white,
            black: pair.black
        }))
})

const getQualityColor = (quality?: string) => {
    switch (quality) {
        case 'blunder': return '#f44336'
        case 'mistake': return '#ff9800'
        case 'inaccuracy': return '#ffeb3b'
        case 'good': return '#4caf50'
        case 'great': return '#2196f3'
        case 'best': return '#2196f3'
        case 'brilliant': return '#9c27b0'
        case 'interesting': return '#00bcd4'
        default: return 'transparent'
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
            cursor: openingStore.isReviewMode ? 'pointer' : 'default',
            background: isActive ? 'var(--color-accent)' : 'transparent',
            padding: '2px 4px',
            borderRadius: '4px',
            color: isActive ? '#fff' : 'inherit',
            justifyContent: 'center'
        },
        onClick: openingStore.isReviewMode ? () => openingStore.setReviewMove(globalIndex) : undefined
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
        }, { default: () => move.nag || '' }) : null
    ])
}

const renderEval = (move: SessionMove | null) => {
    if (!move?.evaluation) return null

    const cp = move.evaluation.score_cp
    const val = (cp / 100).toFixed(1)
    const displayVal = cp > 0 ? `+${val}` : val

    let color = '#aaa'
    if (cp > 150) color = '#4caf50'
    else if (cp < -150) color = '#f44336'

    const cellContent = h('div', {
        style: {
            fontWeight: 'bold',
            color,
            fontSize: '11px',
            textAlign: 'center'
        }
    }, displayVal)

    // Tooltip for Win Prob / WDL
    if (move.evaluation.win_prob !== undefined) {
        let label = `Win Prob: ${move.evaluation.win_prob}%`
        const wdl = move.evaluation.wdl
        if (wdl && wdl.length >= 3) {
            const w = wdl[0] as number
            const d = wdl[1] as number
            const l = wdl[2] as number
            label += ` | WDL: ${(w / 10).toFixed(1)}% ${(d / 10).toFixed(1)}% ${(l / 10).toFixed(1)}%`
        }
        return h(NTooltip, { trigger: 'hover' }, {
            trigger: () => cellContent,
            default: () => label
        })
    }

    return cellContent
}

const renderAnalysisIcons = (move: SessionMove | null) => {
    if (!move) return null
    const icons = []

    // Accuracy Tooltip
    if (move.accuracy !== undefined) {
         icons.push(h(NTooltip, {}, {
             trigger: () => h(NText, { style: { fontSize: '10px', color: '#888' } }, { default: () => `${Math.round(move.accuracy!)}%` }),
             default: () => `Accuracy: ${move.accuracy}%`
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
    if (!move?.tags || move.tags.length === 0) return null
    const icons = []

    for (const tag of move.tags) {
        let icon: typeof FlameOutline | null = null
        let color = '#888'

        switch (tag) {
            case 'Capture': icon = FlameOutline; color = '#ff9800'; break
            case 'Check': icon = FlashOutline; color = '#ffeb3b'; break
            case 'Mate': icon = FlashOutline; color = '#f44336'; break
            case 'Sacrifice': icon = ExtensionPuzzleOutline; color = '#9c27b0'; break
            case 'Promotion': icon = FlashOutline; color = '#4caf50'; break
        }

        if (icon) {
            icons.push(h(NTooltip, {}, {
                trigger: () => h(NIcon, { color, size: 12 }, { default: () => h(icon) }),
                default: () => tag
            }))
        }
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
