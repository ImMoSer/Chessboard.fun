<!-- src/components/OpeningTrainer/OpeningTrainerSettingsModal.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOpeningTrainerStore } from '../../stores/openingTrainer.store';
import { openingGraphService } from '../../services/OpeningGraphService';
import type { OpeningDatabaseSource, LichessParams } from '../../services/OpeningApiService';

const emit = defineEmits(['start', 'close']);
const openingStore = useOpeningTrainerStore();

const selectedColor = ref<'white' | 'black'>('white');
const selectedOpening = ref<{ name: string, moves: string[] } | null>(null);
const majorOpenings = ref<{ name: string, eco?: string, moves: string[] }[]>([]);

// Database Settings (Local State)
const localDbSource = ref<OpeningDatabaseSource>('masters');
const localLichessParams = ref<LichessParams>({
    ratings: [],
    speeds: []
});

const AVAILABLE_RATINGS = [1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];
const AVAILABLE_SPEEDS = ['bullet', 'blitz', 'rapid', 'classical'];

onMounted(async () => {
    await openingGraphService.loadBook();
    majorOpenings.value = openingGraphService.getMajorOpenings();
    
    // Init from store
    selectedColor.value = openingStore.playerColor;
    localDbSource.value = openingStore.dbSource;
    // Clone objects to avoid reactivity linking until save
    localLichessParams.value = {
        ratings: [...openingStore.lichessParams.ratings],
        speeds: [...openingStore.lichessParams.speeds]
    };
});

function toggleRating(r: number) {
    const idx = localLichessParams.value.ratings.indexOf(r);
    if (idx > -1) localLichessParams.value.ratings.splice(idx, 1);
    else localLichessParams.value.ratings.push(r);
}

function toggleSpeed(s: string) {
    const idx = localLichessParams.value.speeds.indexOf(s);
    if (idx > -1) localLichessParams.value.speeds.splice(idx, 1);
    else localLichessParams.value.speeds.push(s);
}

function startSession() {
    // Save DB settings to store
    openingStore.setDatabaseSource(localDbSource.value);
    if (localDbSource.value === 'lichess') {
        // Ensure at least one is selected if empty? Or let it be empty (API might default)
        // Let's rely on API/Store defaults if empty, or just pass what user selected.
        // Actually, API service handles empty? The service code currently does params?.join(',') || default.
        // So sending empty arrays will result in empty strings. Let's safeguard defaults if user deselects all.
        const finalRatings = localLichessParams.value.ratings.length > 0 
            ? localLichessParams.value.ratings 
            : [1600, 1800, 2000, 2200, 2500];
        
        const finalSpeeds = localLichessParams.value.speeds.length > 0 
            ? localLichessParams.value.speeds 
            : ['blitz', 'rapid', 'classical'];

        openingStore.setLichessParams({
            ratings: finalRatings,
            speeds: finalSpeeds
        });
    }

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
                <!-- Color -->
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

                <!-- Database Source -->
                <div class="setting-group">
                    <label>Opponent Database</label>
                    <div class="db-selection">
                        <button class="db-btn" :class="{ active: localDbSource === 'masters' }"
                            @click="localDbSource = 'masters'">
                            Masters DB
                        </button>
                        <button class="db-btn" :class="{ active: localDbSource === 'lichess' }"
                            @click="localDbSource = 'lichess'">
                            Lichess Players
                        </button>
                    </div>
                </div>

                <!-- Lichess Filters -->
                <div v-if="localDbSource === 'lichess'" class="lichess-filters">
                    <div class="filter-section">
                        <label class="sub-label">Ratings</label>
                        <div class="checkbox-grid">
                            <div v-for="r in AVAILABLE_RATINGS" :key="r" 
                                 class="checkbox-item" 
                                 :class="{ checked: localLichessParams.ratings.includes(r) }"
                                 @click="toggleRating(r)">
                                <span class="checkmark">✔</span>
                                {{ r }}
                            </div>
                        </div>
                    </div>
                    
                    <div class="filter-section">
                        <label class="sub-label">Time Control</label>
                        <div class="checkbox-grid">
                            <div v-for="s in AVAILABLE_SPEEDS" :key="s" 
                                 class="checkbox-item"
                                 :class="{ checked: localLichessParams.speeds.includes(s) }"
                                 @click="toggleSpeed(s)">
                                <span class="checkmark">✔</span>
                                <span class="speed-label">{{ s }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Opening -->
                <div class="setting-group">
                    <label>Select Opening (Optional)</label>
                    <select v-model="selectedOpening" class="opening-select">
                        <option :value="null">Start Position (Standard)</option>
                        <option v-for="op in majorOpenings" :key="op.name" :value="op">
                            {{ op.eco ? `[${op.eco}] ` : '' }}{{ op.name }}
                        </option>
                    </select>
                </div>

                <!-- Variability -->
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
    width: 500px;
    max-width: 95%;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    border: 1px solid var(--color-border);
    max-height: 90vh;
    overflow-y: auto;
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
    gap: 20px;
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

/* Color & DB Buttons */
.color-selection, .db-selection {
    display: flex;
    gap: 10px;
}

.color-btn, .db-btn {
    flex: 1;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
}

.color-btn.white { background: #e0e0e0; color: #333; }
.color-btn.black { background: #333; color: #e0e0e0; }

.color-btn.active, .db-btn.active {
    border-color: var(--color-accent);
    background: var(--color-accent-transparent, rgba(100, 200, 100, 0.2));
    color: var(--color-text-primary);
    box-shadow: 0 0 0 2px var(--color-accent);
}

/* Lichess Filters */
.lichess-filters {
    background: rgba(0, 0, 0, 0.2);
    padding: 15px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.sub-label {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    margin-bottom: 8px;
    display: block;
}

.checkbox-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
}

.checkbox-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-primary);
    cursor: pointer;
    font-size: 0.85rem;
    user-select: none;
    transition: all 0.15s;
}

.checkbox-item:hover {
    background: var(--color-bg-tertiary);
}

.checkbox-item.checked {
    border-color: #4caf50;
    background: rgba(76, 175, 80, 0.1);
    color: #4caf50;
    font-weight: bold;
}

.checkmark {
    opacity: 0;
    font-size: 0.8rem;
    transition: opacity 0.15s;
}

.checkbox-item.checked .checkmark {
    opacity: 1;
}

.speed-label {
    text-transform: capitalize;
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
    padding: 14px;
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
