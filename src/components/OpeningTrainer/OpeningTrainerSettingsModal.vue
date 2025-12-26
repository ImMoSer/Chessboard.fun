<!-- src/components/OpeningTrainer/OpeningTrainerSettingsModal.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOpeningTrainerStore } from '../../stores/openingTrainer.store';
import { openingGraphService } from '../../services/OpeningGraphService';

const emit = defineEmits(['start', 'close']);
const openingStore = useOpeningTrainerStore();

const selectedColor = ref<'white' | 'black'>('white');
const selectedOpening = ref<{ name: string, moves: string[] } | null>(null);
const majorOpenings = ref<{ name: string, eco?: string, moves: string[] }[]>([]);

onMounted(async () => {
    await openingGraphService.loadBook();
    majorOpenings.value = openingGraphService.getMajorOpenings();
});

function startSession() {
    // If an opening is selected, use its moves. Otherwise empty array.
    const moves = selectedOpening.value ? selectedOpening.value.moves : [];
    // @ts-ignore
    const slug = selectedOpening.value ? selectedOpening.value.slug : undefined;
    emit('start', selectedColor.value, moves, slug);
}
</script>

<template>
    <div class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Opening Trainer Settings</h2>
                <button class="close-btn" @click="$emit('close')">&times;</button>
            </div>

            <div class="modal-body">
                <div class="setting-group">
                    <label>Choose Color</label>
                    <div class="color-selection">
                        <button class="color-btn white" :class="{ active: selectedColor === 'white' }"
                            @click="selectedColor = 'white'">
                            White
                        </button>
                        <button class="color-btn black" :class="{ active: selectedColor === 'black' }"
                            @click="selectedColor = 'black'">
                            Black
                        </button>
                    </div>
                </div>

                <div class="setting-group">
                    <label>Select Opening (Optional)</label>
                    <select v-model="selectedOpening" class="opening-select">
                        <option :value="null">Start Position (Standard)</option>
                        <option v-for="op in majorOpenings" :key="op.name" :value="op">
                            {{ op.eco ? `[${op.eco}] ` : '' }}{{ op.name }}
                        </option>
                    </select>
                </div>

                <div class="setting-group">
                    <label>Variability: {{ openingStore.variability }}</label>
                    <input type="range" min="1" max="10" v-model.number="openingStore.variability"
                        class="variability-slider" />
                    <p class="hint">Higher variability means the bot plays less popular moves more often.</p>
                </div>
            </div>

            <div class="modal-footer">
                <button class="start-btn" @click="startSession">Start Session</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: var(--color-bg-secondary);
    border-radius: 12px;
    width: 450px;
    max-width: 90%;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    border: 1px solid var(--color-border);
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--color-text-secondary);
    cursor: pointer;
}

.modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.setting-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.setting-group label {
    font-weight: bold;
    color: var(--color-text-primary);
}

.color-selection {
    display: flex;
    gap: 10px;
}

.color-btn {
    flex: 1;
    padding: 12px;
    border-radius: 8px;
    border: 2px solid transparent;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s;
}

.color-btn.white {
    background: #f0f0f0;
    color: #333;
}

.color-btn.black {
    background: #333;
    color: #f0f0f0;
}

.color-btn.active {
    border-color: var(--color-accent);
    transform: scale(1.02);
}

.opening-select {
    padding: 10px;
    border-radius: 8px;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    font-size: 1rem;
}

.variability-slider {
    width: 100%;
    cursor: pointer;
    accent-color: var(--color-accent);
}

.hint {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin: 0;
}

.modal-footer {
    padding: 20px;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: flex-end;
}

.start-btn {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: none;
    background: var(--color-accent);
    color: white;
    font-weight: bold;
    font-size: 1.1rem;
    cursor: pointer;
    transition: background 0.2s;
}

.start-btn:hover {
    background: var(--color-accent-hover);
}
</style>
