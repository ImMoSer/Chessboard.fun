<!-- src/shared/ui/InfoModal.vue -->
<script setup lang="ts">
import { useUiStore } from '@/stores/ui.store'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const uiStore = useUiStore()
const { t } = useI18n()

const show = computed({
  get: () => !!uiStore.infoModalKey,
  set: (val) => {
    if (!val) uiStore.hideInfoModal()
  },
})

const title = computed(() => {
  if (!uiStore.infoModalKey) return ''
  return t(uiStore.infoModalKey + '.title')
})

const content = computed(() => {
  if (!uiStore.infoModalKey) return ''
  return t(uiStore.infoModalKey + '.content')
})
</script>

<template>
  <n-modal v-model:show="show" preset="card" class="info-modal-card" :title="title">
    <div class="modal-body">
      <p class="modal-text">{{ content }}</p>
    </div>
    <template #footer>
      <div class="modal-footer">
        <n-button type="primary" @click="show = false">{{ t('common.close') }}</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.info-modal-card {
  max-width: 500px;
  border-radius: 12px;
}

.modal-text {
  font-family: var(--font-family-primary);
  font-size: var(--font-size-large);
  line-height: 1.6;
  white-space: pre-wrap;
  color: var(--color-text-default);
}

.modal-footer {
  display: flex;
  justify-content: center;
}

:deep(.n-card-header__main) {
  font-family: var(--font-family-primary);
  font-size: var(--font-size-xlarge);
  text-align: center;
}
</style>
