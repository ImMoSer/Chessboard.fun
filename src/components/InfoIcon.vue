// src/components/InfoIcon.vue
<script setup lang="ts">
import { useUiStore } from '../stores/ui.store'

const props = defineProps({
  topic: {
    type: String,
    required: true,
  },
  basePath: {
    type: String,
    default: 'info.leaderboards.',
  },
})

const uiStore = useUiStore()

const showInfo = () => {
  uiStore.showInfoModal(props.basePath + props.topic)
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
  padding: 5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 10px;
  /* Отступ от заголовка */
}

.info-icon {
  width: 25px;
  height: 25px;

}

.info-icon-button:hover .info-icon {
  opacity: 1;
}
</style>
