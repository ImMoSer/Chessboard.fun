<script setup lang="ts">
import { useBoardStore } from '@/stores/board.store'
import { pgnService } from '@/services/PgnService'

const boardStore = useBoardStore()

const handleFlip = () => {
    boardStore.flipBoard()
}

const handleStart = () => boardStore.navigatePgn('start')
const handlePrev = () => boardStore.navigatePgn('backward')
const handleNext = () => boardStore.navigatePgn('forward')
const handleEnd = () => boardStore.navigatePgn('end')

const handleDelete = () => {
    const node = pgnService.getCurrentNode()
    if (node.parent) {
        // Logic to delete node? PgnService needs delete method.
        // For now just undo or ignore.
        // impl: pgnService.deleteCurrentNode()
        console.warn("Delete not implemented yet on service")
    }
}
</script>

<template>
    <div class="study-controls">
        <div class="control-group">
            <button @click="handleFlip" title="Flip Board">🔄</button>
        </div>

        <div class="control-group navigation">
            <button @click="handleStart" title="Start">|&lt;</button>
            <button @click="handlePrev" title="Previous">&lt;</button>
            <button @click="handleNext" title="Next">&gt;</button>
            <button @click="handleEnd" title="End">&gt;|</button>
        </div>

        <div class="control-group actions">
            <!-- Placeholder for edit actions -->
            <button @click="handleDelete" title="Delete Move (Not Impl)" disabled>🗑️</button>
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

button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
