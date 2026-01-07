<script setup lang="ts">
import { useBoardStore } from '@/stores/board.store'
import { pgnService } from '@/services/PgnService'
import { useAnalysisStore } from '@/stores/analysis.store'

const boardStore = useBoardStore()
const analysisStore = useAnalysisStore()

const handleFlip = () => {
    boardStore.flipBoard()
}

const handleStart = () => boardStore.navigatePgn('start')
const handlePrev = () => boardStore.navigatePgn('backward')
const handleNext = () => boardStore.navigatePgn('forward')
const handleEnd = () => boardStore.navigatePgn('end')

const handleToggleAnalysis = () => {
    analysisStore.toggleAnalysis()
}

const handleDelete = () => {
    pgnService.deleteCurrentNode()
    boardStore.syncBoardWithPgn()
}
</script>

<template>
    <div class="study-controls">
        <div class="control-group">
            <button @click="handleFlip" title="Flip Board">🔄</button>
            <button @click="handleToggleAnalysis" :class="{ active: analysisStore.isAnalysisActive }" title="Toggle Analysis">📊</button>
        </div>

        <div class="control-group navigation">
            <button @click="handleStart" title="Start">|&lt;</button>
            <button @click="handlePrev" title="Previous">&lt;</button>
            <button @click="handleNext" title="Next">&gt;</button>
            <button @click="handleEnd" title="End">&gt;|</button>
        </div>

        <div class="control-group actions">
            <!-- Placeholder for edit actions -->
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
}

button:hover {
    background: var(--color-bg-primary);
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
