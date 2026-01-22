<!-- src/components/practical/YouMoveSelection.vue -->
<script setup lang="ts">
import { usePracticalChessStore } from '@/stores/practicalChess.store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const practicalStore = usePracticalChessStore()

const handleSelection = (color: 'white' | 'black') => {
  practicalStore.startYouMoveGame(color)
}
</script>

<template>
  <div class="you-move-panel glass-panel">
    <h1 class="title">{{ t('practicalChess.youMove.title') }}</h1>
    <p class="subtitle">{{ t('practicalChess.youMove.subtitle') }}</p>

    <div class="options-grid">
      <button class="option-btn white" @click="handleSelection('white')">
        <div class="icon">♗</div>
        <span class="label">{{ t('practicalChess.youMove.playWhite') }}</span>
      </button>

      <button class="option-btn black" @click="handleSelection('black')">
        <div class="icon">♝</div>
        <span class="label">{{ t('practicalChess.youMove.playBlack') }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.you-move-panel {
  width: 100%;
  padding: 20px 16px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: fadeIn 0.4s ease-out;
  box-sizing: border-box;
  overflow: hidden;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.title {
  font-size: 1.5rem;
  font-weight: 900;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #fff 0%, var(--color-accent-primary) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 1px;
  text-transform: uppercase;
  word-wrap: break-word;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin-bottom: 24px;
  line-height: 1.4;
  word-wrap: break-word;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  width: 100%;
}

.option-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.03);
  min-width: 0;
}

.option-btn:hover {
  transform: translateY(-3px);
}

.option-btn.white {
  box-shadow: 0 0 15px rgba(255, 255, 255, 0);
}
.option-btn.white:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 10px 20px rgba(255, 255, 255, 0.1);
}

.option-btn.black {
  box-shadow: 0 0 15px rgba(212, 175, 55, 0);
}
.option-btn.black:hover {
  background: rgba(212, 175, 55, 0.1);
  border-color: rgba(212, 175, 55, 0.5);
  box-shadow: 0 10px 20px rgba(212, 175, 55, 0.1);
}

.icon {
  font-size: 2.2rem;
  line-height: 1;
}

.option-btn.white .icon {
  color: white;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
}

.option-btn.black .icon {
  color: #fbbf24;
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.3));
}

.label {
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.white .label {
  color: white;
}

.black .label {
  color: #fbbf24;
}

@media (max-width: 480px) {
  .options-grid {
    grid-template-columns: 1fr;
  }
}
</style>
