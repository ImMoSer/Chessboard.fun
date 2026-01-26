<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  w: number // White traps
  b: number // Black traps
}

const props = defineProps<Props>()

const total = computed(() => props.w + props.b)
const wPct = computed(() => (total.value > 0 ? (props.w / total.value) * 100 : 50))
const bPct = computed(() => (total.value > 0 ? (props.b / total.value) * 100 : 50))

const wLabel = computed(() => (total.value > 0 ? Math.round((props.w / total.value) * 100) + '%' : '-'))
const bLabel = computed(() => (total.value > 0 ? Math.round((props.b / total.value) * 100) + '%' : '-'))
</script>

<template>
  <div class="trap-bar-container">
    <div class="trap-bar">
      <div 
        class="fill white-fill" 
        :style="{ width: wPct + '%' }"
      >
        <span v-if="wPct > 20" class="pct-label">{{ wLabel }}</span>
      </div>
      <div 
        class="fill black-fill" 
        :style="{ width: bPct + '%' }"
      >
        <span v-if="bPct > 20" class="pct-label">{{ bLabel }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trap-bar-container {
  width: 100%;
  height: 16px;
  display: flex;
  align-items: center;
}

.trap-bar {
  display: flex;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.fill {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.3s ease;
}

.white-fill {
  background: #00bcd4; /* Cyan - как в CLI */
  color: #000;
}

.black-fill {
  background: #f44336; /* Red - как в CLI */
  color: #fff;
}

.pct-label {
  font-size: 9px;
  font-weight: bold;
  pointer-events: none;
}
</style>
