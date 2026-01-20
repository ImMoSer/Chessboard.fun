<script setup lang="ts">
import { pgnParserService } from '@/services/PgnParserService'
import { pgnService, type PgnNode } from '@/services/PgnService'
import { repertoireApiService, type RepertoireProfile, type RepertoireStyle } from '@/services/RepertoireApiService'
import { useBoardStore } from '@/stores/board.store'
import { useStudyStore } from '@/stores/study.store'
import { NPopover, NSelect, NTooltip, useMessage } from 'naive-ui'
import { computed, ref } from 'vue'

const boardStore = useBoardStore()
const studyStore = useStudyStore()
const message = useMessage()

const isGenerating = ref(false)
const selectedProfile = ref<RepertoireProfile>('amateur')
const selectedStyle = ref<RepertoireStyle>('master')

const styleOptions = [
  { label: '⚖️ Balanced Master', value: 'master', description: 'Theoretical & sound, optimized for professional growth.' },
  { label: '🧱 The Wall', value: 'wall', description: 'Rock-solid defense, minimizes risk and aims for safe endgames.' },
  { label: '🃏 The Hustler', value: 'hustler', description: 'Sharp traps and obscure lines to confuse your opponent.' },
  { label: '🐍 Boa Constrictor', value: 'constrictor', description: 'Positional squeeze, avoids early simplification, keeps tension.' },
  { label: '👑 Forsage (Dictator)', value: 'dictator', description: 'Forces forcing lines, giving opponent minimal choices.' },
]

const profileOptions = [
  { label: 'Amateur (Standard)', value: 'amateur' },
  { label: 'Club (Advanced)', value: 'club' },
  { label: 'Master (Comprehensive)', value: 'master' },
]

const selectedStyleData = computed(() =>
  styleOptions.find(s => s.value === selectedStyle.value)!
)

const selectedStyleCleanName = computed(() => {
  const label = selectedStyleData.value.label
  return label.split(' ').slice(1).join(' ')
})

const canGenerate = computed(() => {
  const ply = pgnService.getCurrentPly();
  const chapter = studyStore.activeChapter;
  if (!chapter || !chapter.color) return false;

  // Must have at least one move, but no more than 10 plies
  const isInRange = ply > 0 && ply <= 12;

  // The button is active when it's the OPPONENT'S turn
  // (User made their move, now asking for responses)
  const isOpponentTurn = boardStore.turn !== chapter.color;

  return isInRange && isOpponentTurn;
});

const handleFlip = () => {
  boardStore.flipBoard()
}

const handleStart = () => boardStore.navigatePgn('start')
const handlePrev = () => boardStore.navigatePgn('backward')
const handleNext = () => boardStore.navigatePgn('forward')
const handleEnd = () => boardStore.navigatePgn('end')

const handleDelete = () => {
  pgnService.deleteCurrentNode()
  boardStore.syncBoardWithPgn()
}

const handleCopyFen = () => {
  const fen = pgnService.getCurrentNavigatedFen()
  navigator.clipboard.writeText(fen)
  message.success('FEN copied!')
}

const handleCopyPgn = () => {
  const pgn = pgnService.getFullPgn({})
  navigator.clipboard.writeText(pgn)
  message.success('PGN copied!')
}

const handleGenerateRepertoire = async () => {
  if (!studyStore.activeChapter || !studyStore.activeChapter.color) {
    message.warning('Please select a color for this chapter first.')
    return
  }

  isGenerating.value = true
  const styleLabel = styleOptions.find(s => s.value === selectedStyle.value)?.label || selectedStyle.value;

  try {
    const currentPgn = pgnService.getCurrentPgnString({ showVariations: false })
    const params = {
      start_pgn: currentPgn,
      color: studyStore.activeChapter.color,
      profile: selectedProfile.value
    }

    const pgn = await repertoireApiService.generateRepertoire(selectedStyle.value, params)
    if (pgn) {
      const { root: parsedRoot } = pgnParserService.parse(pgn)

      // Find the node in parsedRoot that corresponds to our current position
      let sourceNode = parsedRoot
      const currentPly = pgnService.getCurrentPly()
      for (let i = 0; i < currentPly; i++) {
        const firstChild: PgnNode | undefined = sourceNode.children[0];
        if (firstChild) {
          sourceNode = firstChild;
        } else {
          break;
        }
      }

      pgnService.mergeSubtree(pgnService.getCurrentNode(), sourceNode)
      boardStore.syncBoardWithPgn()
      message.success(`${styleLabel} repertoire integrated!`)
    } else {
      message.error('Failed to generate repertoire')
    }
  } catch (e: unknown) {
    const error = e as Error;
    console.error(error)
    message.error(error.message || 'An error occurred during generation')
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <div class="study-controls">
    <div class="control-group">
      <n-tooltip v-if="!studyStore.activeChapter?.color" trigger="hover">
        <template #trigger>
          <button @click="handleFlip">🔄</button>
        </template>
        Flip Board
      </n-tooltip>
      <n-tooltip trigger="hover">
        <template #trigger>
          <button @click="handleCopyFen">FEN</button>
        </template>
        Copy FEN
      </n-tooltip>
      <n-tooltip trigger="hover">
        <template #trigger>
          <button @click="handleCopyPgn">PGN</button>
        </template>
        Copy PGN
      </n-tooltip>
    </div>

    <div class="control-group navigation">
      <button @click="handleStart" title="Start">|&lt;</button>
      <button @click="handlePrev" title="Previous">&lt;</button>
      <button @click="handleNext" title="Next">&gt;</button>
      <button @click="handleEnd" title="End">&gt;|</button>
    </div>

    <div v-if="canGenerate" class="control-group repertoire">
      <div class="gen-params">
        <n-select v-model:value="selectedProfile" :options="profileOptions" size="small" class="profile-select" />

        <n-popover trigger="click" placement="top" :width="300">
          <template #trigger>
            <button class="style-btn">
              {{ selectedStyleData.label.split(' ')[0] }}
            </button>
          </template>
          <div class="style-picker">
            <div v-for="s in styleOptions" :key="s.value" class="style-option"
              :class="{ active: selectedStyle === s.value }" @click="selectedStyle = s.value as RepertoireStyle">
              <span class="style-icon">{{ s.label.split(' ')[0] }}</span>
              <div class="style-info">
                <div class="style-name">{{ s.label.split(' ').slice(1).join(' ') }}</div>
                <div class="style-desc">{{ s.description }}</div>
              </div>
            </div>
          </div>
        </n-popover>
      </div>

      <button @click="handleGenerateRepertoire" :disabled="isGenerating" class="gen-btn"
        :title="`Generate ${selectedStyle} Repertoire`" :class="{ 'gen-loading': isGenerating }">
        <span v-if="!isGenerating">⚡ Generate {{ selectedStyleCleanName }}</span>
        <span v-else>⌛ Analyzing...</span>
      </button>
    </div>

    <div class="control-group actions">
      <n-tooltip trigger="hover">
        <template #trigger>
          <button @click="handleDelete" class="delete-btn">🗑️</button>
        </template>
        Delete current move & branch
      </n-tooltip>
    </div>
  </div>
</template>

<style scoped>
.study-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 15px;
  height: 100%;
  background: rgba(26, 26, 26, 0.4);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  color: var(--color-text-primary);
}

.control-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 1em;
  display: flex;
  align-items: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-primary);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

.navigation button {
  font-weight: bold;
  min-width: 36px;
  justify-content: center;
}

.repertoire {
  gap: 12px;
}

.gen-params {
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.2);
  padding: 2px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.profile-select {
  width: 140px;
}

.style-btn {
  font-size: 1.2em;
  padding: 4px 8px;
  background: transparent;
  border: none;
}

.style-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px;
}

.style-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.style-option:hover {
  background: rgba(255, 255, 255, 0.05);
}

.style-option.active {
  background: rgba(var(--color-accent-primary-rgb), 0.1);
  border-color: var(--color-accent-primary);
}

.style-icon {
  font-size: 1.5em;
}

.style-info {
  display: flex;
  flex-direction: column;
}

.style-name {
  font-weight: bold;
  font-size: 0.95em;
  color: var(--color-text-primary);
}

.style-desc {
  font-size: 0.8em;
  color: var(--color-text-secondary);
  line-height: 1.2;
}

.gen-btn {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  border: none;
  color: white;
  font-weight: 600;
  font-size: 0.9em;
  padding: 8px 16px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  position: relative;
  overflow: hidden;
}

.gen-btn:hover {
  background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  transform: translateY(-2px);
}

.gen-btn:disabled {
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

.gen-loading {
  background: linear-gradient(135deg, #4b5563 0%, #1f2937 100%);
}

.delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}

/* Animations */
@keyframes pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }

  100% {
    transform: scale(1);
  }
}

.gen-btn:not(:disabled):hover span {
  animation: pulse 1s infinite ease-in-out;
}
</style>
