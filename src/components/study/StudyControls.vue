<script setup lang="ts">
import { pgnParserService } from '@/services/PgnParserService'
import { pgnService, type PgnNode } from '@/services/PgnService'
import { repertoireApiService } from '@/services/RepertoireApiService'
import { useBoardStore } from '@/stores/board.store'
import { useStudyStore } from '@/stores/study.store'
import { useMessage } from 'naive-ui'
import { computed, ref } from 'vue'

const boardStore = useBoardStore()
const studyStore = useStudyStore()
const message = useMessage()

const isGenerating = ref(false)
const selectedProfile = ref<'amateur' | 'club' | 'master'>('amateur')

const canGenerate = computed(() => {
  const ply = pgnService.getCurrentPly();
  const chapter = studyStore.activeChapter;
  if (!chapter || !chapter.color) return false;

  // Must have at least one move, but no more than 10 plies
  const isInRange = ply > 0 && ply <= 10;

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
  try {
    const currentPgn = pgnService.getCurrentPgnString({ showVariations: false })
    const params = {
      start_pgn: currentPgn,
      color: studyStore.activeChapter.color,
      profile: selectedProfile.value
    }

    const pgn = await repertoireApiService.generateSharpRepertoire(params)
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
      message.success('Repertoire generated!')
    } else {
      message.error('Failed to generate repertoire')
    }
  } catch (e) {
    console.error(e)
    message.error('An error occurred during generation')
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <div class="study-controls">
    <div class="control-group">
      <button @click="handleFlip" title="Flip Board">🔄</button>
      <button @click="handleCopyFen" title="Copy FEN">📋 FEN</button>
      <button @click="handleCopyPgn" title="Copy PGN">📋 PGN</button>
    </div>

    <div class="control-group navigation">
      <button @click="handleStart" title="Start">|&lt;</button>
      <button @click="handlePrev" title="Previous">&lt;</button>
      <button @click="handleNext" title="Next">&gt;</button>
      <button @click="handleEnd" title="End">&gt;|</button>
    </div>

    <div v-if="canGenerate" class="control-group repertoire">
      <select v-model="selectedProfile" class="profile-select" title="Difficulty Profile">
        <option value="amateur">Amateur</option>
        <option value="club">Club</option>
        <option value="master">Master</option>
      </select>
      <button @click="handleGenerateRepertoire" :disabled="isGenerating" class="gen-btn"
        title="Generate Sharp Repertoire">
        {{ isGenerating ? '⌛ Generating...' : '⚡ Generate Sharp' }}
      </button>
    </div>

    <div class="control-group actions">
      <button @click="handleDelete" title="Delete Move">🗑️</button>
    </div>
  </div>
</template>

<style scoped>
.study-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 10px;
  height: 100%;
  color: var(--color-text-primary);
}

.control-group {
  display: flex;
  gap: 5px;
}

button {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 1.1em;
  display: flex;
  align-items: center;
  gap: 4px;
}

button[title*="Copy"] {
  font-size: 0.9em;
}

button:hover {
  background: var(--color-bg-primary);
}

.profile-select {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  border-radius: 4px;
  padding: 0 5px;
  font-size: 0.85em;
  cursor: pointer;
}

.gen-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: none;
  color: white;
  font-weight: bold;
  font-size: 0.9em;
}

.gen-btn:hover {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
}

button.active {
  background: var(--color-accent-primary);
  color: white;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
