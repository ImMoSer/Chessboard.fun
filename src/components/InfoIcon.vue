// src/components/InfoIcon.vue
<script setup lang="ts">
import { useUiStore } from '../stores/ui.store'

const props = defineProps({
  topic: {
    type: String,
    required: true,
  },
})

const uiStore = useUiStore()

const showInfo = () => {
  uiStore.showInfoModal('info.leaderboards.' + props.topic)
}
</script>

<template>
  <button class="info-icon-button" @click="showInfo">
    <img src="/buttons/info.svg" alt="Info" class="info-icon" />
  </button>
</template>

<style scoped>
.info-icon-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  /* Отступ от заголовка */
}

.info-icon {
  width: 25px;
  height: 25px;
  opacity: 0.9;
  transition: opacity 0.2s ease;
}

.info-icon-button:hover .info-icon {
  opacity: 1;
}
</style>
