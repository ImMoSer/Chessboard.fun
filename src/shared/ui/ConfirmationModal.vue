<!-- src/shared/ui/ConfirmationModal.vue -->
<script setup lang="ts">
import { useUiStore } from '@/shared/ui/model/ui.store';

const uiStore = useUiStore()
</script>

<template>
  <div v-if="uiStore.isModalVisible" class="modal-overlay" @click.self="uiStore.handleOverlayClick">
    <div class="modal-content">
      <h3 class="modal-title">{{ uiStore.modalTitle }}</h3>
      <p class="modal-message">{{ uiStore.modalMessage }}</p>
      <div class="modal-actions">
        <button
          v-if="uiStore.isExtraButtonVisible"
          class="button-extra"
          @click="uiStore.handleExtra"
        >
          {{ uiStore.modalExtraText }}
        </button>
        <button
          v-if="uiStore.isCancelButtonVisible"
          class="button-cancel"
          @click="uiStore.handleCancel"
        >
          {{ uiStore.modalCancelText }}
        </button>
        <button class="button-confirm" @click="uiStore.handleConfirm">
          {{ uiStore.modalConfirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Стили без изменений */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal-content {
  background-color: var(--color-bg-secondary);
  padding: 2rem;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  width: 90%;
  max-width: 350px;
  text-align: center;
}

.modal-title {
  margin-top: 0;
  color: var(--color-accent-warning);
  font-size: var(--font-size-large);
}

.modal-message {
  color: var(--color-text-default);
  margin-bottom: 2rem;
}

.modal-actions {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
}

.modal-actions button {
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 5px;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-cancel {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-default);
}

.button-cancel:hover {
  background-color: var(--color-border-hover);
}

.button-confirm {
  background-color: var(--color-accent-error);
  color: var(--color-text-on-accent);
}

.button-confirm:hover {
  background-color: var(--color-accent-error-hover);
}

.button-extra {
  background-color: var(--color-accent-success);
  color: var(--color-text-dark);
}

.button-extra:hover {
  background-color: var(--color-accent-success-hover);
}

@media (max-width: 400px) {
.modal-content {

  max-width: 285px;

}
}
</style>
