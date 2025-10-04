// src/components/InfoModal.vue
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '../stores/ui.store'

const uiStore = useUiStore()
const { t } = useI18n()

const title = computed(() => {
  if (!uiStore.infoModalKey) return ''
  return t(uiStore.infoModalKey + '.title')
})

const content = computed(() => {
  if (!uiStore.infoModalKey) return ''
  return t(uiStore.infoModalKey + '.content')
})

const closeModal = () => {
  uiStore.hideInfoModal()
}
</script>

<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <h2 class="modal-title">{{ title }}</h2>
      <p class="modal-text">{{ content }}</p>
      <button class="modal-close-button" @click="closeModal">{{ t('common.close') }}</button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--color-bg-secondary);
  padding: 30px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  width: 90%;
  max-width: 500px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.modal-title {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--color-heading);
  font-size: 1.5rem;
}

.modal-text {
  margin-bottom: 25px;
  color: var(--color-text);
  font-size: 1.1rem;
  white-space: pre-wrap; /* Сохраняет пробелы и переносы строк */
}

.modal-close-button {
  background-color: var(--color-primary);
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s ease;
}

.modal-close-button:hover {
  background-color: var(--color-primary-hover);
}
</style>