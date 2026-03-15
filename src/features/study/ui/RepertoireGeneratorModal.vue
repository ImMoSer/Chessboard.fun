<script setup lang="ts">
import { useBoardStore } from '@/entities/game'
import {
  repertoireApiService,
  type RepertoireRequest,
  type RepertoireStyle,
} from '../api/RepertoireApiService'
import { useStudyStore } from '../index'
import { pgnParserService } from '@/shared/lib/pgn/PgnParserService'
import { pgnService, type PgnNode } from '@/shared/lib/pgn/PgnService'
import { FlashOutline } from '@vicons/ionicons5'
import { NButton, NIcon, NModal, NSpace, NSlider, NInputNumber, useMessage } from 'naive-ui'
import { computed, ref } from 'vue'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const studyStore = useStudyStore()
const boardStore = useBoardStore()
const message = useMessage()

// State
const isGenerating = ref(false)
const selectedStyle = ref<RepertoireStyle>('grossmaster')
const opponentCoverageDisplay = ref(50) // User sees 30-90

const styleOptions = [
  {
    label: '🏛️ GrossMaster',
    value: 'grossmaster',
    description: 'Maximum reliability and theoretical soundness. The elite choice.',
  },
  {
    label: '🃏 The Hustler',
    value: 'hustler',
    description: 'Professional Poker Player: Uses solid sidelines to achieve the best mathematical results over time.',
  },
  {
    label: '🎭 The Swindler',
    value: 'schuler',
    description: 'Sharp traps and "poisonous" lines. Provocative play designed to deceive and lure opponents into fatal mistakes.',
  },
]

const selectedStyleCleanName = computed(() => {
  const opt = styleOptions.find((s) => s.value === selectedStyle.value)
  return opt ? opt.label.split(' ').slice(1).join(' ') : ''
})

const handleGenerateRepertoire = async () => {
  if (!studyStore.activeChapter || !studyStore.activeChapter.color) {
    message.warning('Please set the chapter color first (in Study Manager).')
    return
  }

  isGenerating.value = true
  const styleLabel =
    styleOptions.find((s) => s.value === selectedStyle.value)?.label || selectedStyle.value

  try {
    const currentPgn = pgnService.getCurrentPgnString({ showVariations: false })
    const request: RepertoireRequest = {
      start_pgn: currentPgn,
      color: studyStore.activeChapter.color as 'white' | 'black',
      style: selectedStyle.value,
      min_games: 5,
      opponent_coverage: opponentCoverageDisplay.value / 100, // Convert 50 -> 0.5
      max_depth: 20,
      opponent_data: 'MASTERS'
    }

    const pgn = await repertoireApiService.generateRepertoire(request)
    if (pgn) {
      const { root: parsedRoot } = pgnParserService.parse(pgn)

      let sourceNode = parsedRoot
      const currentPly = pgnService.getCurrentPly()

      for (let i = 0; i < currentPly; i++) {
        const firstChild: PgnNode | undefined = sourceNode.children[0]
        if (firstChild) {
          sourceNode = firstChild
        } else {
          break
        }
      }

      pgnService.mergeSubtree(pgnService.getCurrentNode(), sourceNode)
      boardStore.syncBoardWithPgn()

      message.success(`${styleLabel} repertoire integrated!`)
      emit('update:show', false)
    } else {
      message.error('Failed to generate repertoire')
    }
  } catch (e: unknown) {
    const error = e as Error
    console.error(error)
    message.error(error.message || 'An error occurred during generation')
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <NModal
    :show="show"
    @update:show="(v) => emit('update:show', v)"
    preset="card"
    title="Generate Repertoire"
    style="width: 550px; max-width: 95vw"
  >
    <NSpace vertical size="large">
      <div v-if="studyStore.activeChapter?.color">
        Generating for <strong style="text-transform: capitalize;">{{ studyStore.activeChapter.color }}</strong> from current position.
      </div>
      <div v-else class="warning-text">
        Warning: Chapter color is not set. Please set it in Study Manager.
      </div>

      <!-- Style Selector -->
      <div>
        <label class="section-label">Play Style</label>
        <div class="style-list">
          <div
            v-for="s in styleOptions"
            :key="s.value"
            class="style-card"
            :class="{ active: selectedStyle === s.value }"
            @click="selectedStyle = s.value as RepertoireStyle"
          >
            <div class="style-header">{{ s.label }}</div>
            <div class="style-desc">{{ s.description }}</div>
          </div>
        </div>
      </div>

      <!-- Parameters -->
      <div class="params-section">
        <label class="section-label">Actuarial Parameters</label>
        
        <div class="param-row">
          <div class="param-info">
            <span class="param-name">Opponent Coverage (%)</span>
            <span class="param-desc">
              Trade-off: High coverage creates a wider repertoire but with less depth. 
              Low coverage focuses on the most popular lines with more depth.
            </span>
          </div>
          <div class="param-control">
            <NSlider v-model:value="opponentCoverageDisplay" :min="30" :max="90" :step="1" />
            <NInputNumber v-model:value="opponentCoverageDisplay" size="small" :min="30" :max="90" style="width: 80px" />
          </div>
        </div>
      </div>

      <NSpace justify="end" style="margin-top: 10px;">
        <NButton @click="emit('update:show', false)">Cancel</NButton>
        <NButton
          type="primary"
          :loading="isGenerating"
          :disabled="!studyStore.activeChapter?.color"
          @click="handleGenerateRepertoire"
        >
          <template #icon>
            <NIcon><FlashOutline /></NIcon>
          </template>
          Generate {{ selectedStyleCleanName }}
        </NButton>
      </NSpace>
    </NSpace>
  </NModal>
</template>

<style scoped>
.style-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 5px;
}

.style-card {
  border: 1px solid var(--color-border);
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-bg-secondary);
}

.style-card:hover {
  border-color: var(--color-accent-primary);
  background: rgba(var(--color-accent-primary-rgb), 0.05);
}

.style-card.active {
  border-color: var(--color-accent-primary);
  background: rgba(var(--color-accent-primary-rgb), 0.1);
  box-shadow: 0 0 0 1px var(--color-accent-primary);
}

.style-header {
  font-weight: bold;
  font-size: 1.1em;
  margin-bottom: 4px;
}

.style-desc {
  font-size: 0.9em;
  color: var(--color-text-secondary);
}

.section-label {
  font-weight: 600;
  margin-bottom: 5px;
  display: block;
  color: var(--color-text-primary);
}

.params-section {
  background: var(--color-bg-secondary);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.param-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  margin-bottom: 15px;
}

.param-row:last-child {
  margin-bottom: 0;
}

.param-info {
  display: flex;
  flex-direction: column;
  width: 45%;
}

.param-name {
  font-weight: 500;
  font-size: 0.95em;
}

.param-desc {
  font-size: 0.8em;
  color: var(--color-text-secondary);
}

.param-control {
  display: flex;
  align-items: center;
  gap: 15px;
  width: 50%;
}

.warning-text {
  color: #ff5252;
}
</style>
