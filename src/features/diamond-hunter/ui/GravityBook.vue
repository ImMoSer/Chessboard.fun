<script setup lang="ts">
import { useBoardStore } from '@/entities/board'
import { useAnalysisStore } from '@/features/analysis'
import { useDiamondHunterStore } from '@/features/diamond-hunter'
import { type GravityMove } from '@/features/diamond-hunter/api/DiamondApiService'
import { NDataTable, NEmpty, NTag } from 'naive-ui'
import { computed, h, watch } from 'vue'

interface GravityMoveWithPercent extends GravityMove {
  percent: string
}

const boardStore = useBoardStore()
const analysisStore = useAnalysisStore()
const diamondStore = useDiamondHunterStore()

const moves = computed<GravityMoveWithPercent[]>(() => {
    const stats = diamondStore.currentGravityStats
    if (!stats || !stats.moves) return []

    const totalWeight = stats.moves.reduce((acc, m) => acc + m.weight, 0)

    return [...stats.moves].map(m => ({
        ...m,
        percent: totalWeight > 0 ? ((m.weight / totalWeight) * 100).toFixed(1) : '0.0'
    })).sort((a, b) => b.weight - a.weight)
})

const isLoading = computed(() => false) // Since store handles fetching, we just react to state

const columns = [
  {
    title: 'Moves',
    key: 'san',
    width: 80,
    render(row: GravityMoveWithPercent) {
       return row.san
    }
  },
  {
    title: 'Weight',
    key: 'weight',
    width: 70,
    align: 'right' as const
  },
  {
    title: '%',
    key: 'percent',
    width: 60,
    align: 'right' as const,
    render(row: GravityMoveWithPercent) {
       return `${row.percent}%`
    }
  },
  {
    title: 'Rating',
    key: 'rating',
    width: 70,
    align: 'right' as const
  },
  {
    title: 'MinDist',
    key: 'dist',
    width: 80,
    align: 'center' as const,
    render(row: GravityMoveWithPercent) {
        // Render Dist with visual cues
        const tags = []
        tags.push(row.dist.toString())

        if (row.dist <= 3) {
            return [row.dist, ' ', h(NTag, { type: 'success', size: 'tiny', bordered: false }, { default: () => '!' })]
        } else if (row.dist <= 5) {
             return [row.dist, ' ', h(NTag, { type: 'info', size: 'tiny', bordered: false }, { default: () => '!?' })]
        }
        return row.dist
    }
  },
  {
    title: 'NAG',
    key: 'nag_str',
    width: 60,
    align: 'center' as const,
    render(row: GravityMoveWithPercent) {
        if (!row.nag) return ''
        let type: 'default' | 'error' | 'primary' | 'info' | 'success' | 'warning' = 'default'

        if (row.nag === 3) type = 'success' // !!
        if (row.nag === 255) type = 'primary' // !!! (Win)
        if (row.nag === 4) type = 'error' // ??
        if (row.nag === 7) type = 'info' // Only

        return h(NTag, { type, size: 'small', bordered: false }, { default: () => row.nag_str })
    }
  }
]

// Fetching is triggered by the View/Store logic on board updates.
// We just display what's in the store.

// Ensure data is fetched even if not hunting (e.g. Analysis Mode)
watch(() => boardStore.fen, async (newFen) => {
    // If hunting is active, the game logic (botMove/updateArrows) handles fetching.
    // We only fetch manually in Analysis/Idle mode.
    if (diamondStore.isActive) return

    // Vue query handles deduplication and caching for us.
    // We just trigger the store action, which returns instantly if cached.
    await diamondStore.fetchGravityForFen(newFen)
}, { immediate: true })

// Header Title based on Player Color (The database we are looking at)
const title = computed(() => {
    const color = analysisStore.playerColor || 'white'
    return color === 'white' ? 'WHITE GRAVITY MAP' : 'BLACK GRAVITY MAP'
})

</script>

<template>
  <div class="gravity-book">
      <div class="header">
          {{ title }}
      </div>
      <div class="content">
            <n-data-table
                :columns="columns"
                :data="moves"
                :bordered="false"
                :single-line="false"
                size="small"
                :max-height="600"
                virtual-scroll
            />
            <n-empty v-if="!isLoading && moves.length === 0" description="No Gravity Data" style="padding: 20px" />
      </div>
  </div>
</template>

<style scoped>
.gravity-book {
    background: var(--color-bg-secondary);
    border-radius: 8px;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.header {
    padding: 10px 15px;
    font-weight: bold;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    text-transform: uppercase;
    color: #64B5F6; /* Light Blue */
    font-family: monospace;
}

.content {
    flex: 1;
    overflow: hidden;
}

:deep(.n-data-table .n-data-table-td) {
    padding: 4px 8px;
    font-family: monospace;
    font-size: 0.9rem;
}

:deep(.n-data-table .n-data-table-th) {
    font-weight: bold;
    background-color: rgba(0,0,0,0.2);
}
</style>
