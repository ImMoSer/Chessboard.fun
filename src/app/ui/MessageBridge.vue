<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { onMounted } from 'vue'

/**
 * This component "captures" the Naive UI message API and attaches it to window.$message
 * so it can be used globally, including inside Pinia stores.
 */
const message = useMessage()

onMounted(() => {
  window.$message = message
})
</script>

<template>
  <div v-if="false"></div>
</template>
