<!-- src/views/TornadoMistakesView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBoardStore } from '@/stores/board.store'
import GameLayout from '@/components/GameLayout.vue'

const MISTAKES_STORAGE_KEY = 'tornado_mistakes'
const boardStore = useBoardStore()

const mistakes = ref<string[]>([])
const selectedFen = ref<string | null>(null)

onMounted(() => {
  const storedMistakes = localStorage.getItem(MISTAKES_STORAGE_KEY)
  if (storedMistakes) {
    mistakes.value = JSON.parse(storedMistakes)
    const firstMistake = mistakes.value[0]
    if (firstMistake) {
      selectMistake(firstMistake)
    }
  }
})

const selectMistake = (fen: string) => {
  selectedFen.value = fen
  boardStore.setupPosition(fen, 'white') // Ориентация может быть любой для анализа
}
</script>

<template>
  <GameLayout>
    <template #left-panel>
      <div class="mistakes-list-container">
        <h4>Ошибки</h4>
        <div class="mistakes-list">
          <div
            v-for="(fen, index) in mistakes"
            :key="index"
            class="mistake-item"
            :class="{ active: fen === selectedFen }"
            @click="selectMistake(fen)"
          >
            Ошибка #{{ index + 1 }}
          </div>
          <div v-if="mistakes.length === 0" class="no-mistakes">
            В последней сессии не было ошибок!
          </div>
        </div>
      </div>
    </template>

    <template #right-panel>
      <div class="analysis-placeholder">
        <!-- Здесь будет AnalysisPanel -->
        <h4>Анализ</h4>
        <p>Панель анализа будет доступна на следующих этапах.</p>
      </div>
    </template>
  </GameLayout>
</template>

<style scoped>
.mistakes-list-container {
  padding: 10px;
}
h4 {
  text-align: center;
  margin-top: 0;
  color: var(--color-accent-warning);
}
.mistakes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 80vh;
  overflow-y: auto;
}
.mistake-item {
  padding: 15px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--panel-border-radius);
  cursor: pointer;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}
.mistake-item:hover {
  border-color: var(--color-accent-primary);
}
.mistake-item.active {
  background-color: var(--color-accent-primary);
  color: var(--color-text-dark);
  font-weight: bold;
}
.no-mistakes {
  text-align: center;
  color: var(--color-text-muted);
  padding: 20px;
}
.analysis-placeholder {
  padding: 20px;
  text-align: center;
}
</style>

