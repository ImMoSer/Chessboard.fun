<script setup lang="ts">
import { useBoardStore } from '@/entities/board'
import {
    repertoireApiService,
    type RepertoireProfile,
    type RepertoireRequest,
    type RepertoireStyle,
} from '@/features/study/api/RepertoireApiService'
import { useStudyStore } from '@/features/study/model/study.store'
import { pgnParserService } from '@/shared/lib/pgn/PgnParserService'
import { pgnService, type PgnNode } from '@/shared/lib/pgn/PgnService'
import { FlashOutline } from '@vicons/ionicons5'
import {
    NButton,
    NIcon,
    NModal,
    NSelect,
    NSpace,
    useMessage
} from 'naive-ui'
import { computed, ref } from 'vue'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const studyStore = useStudyStore()
const boardStore = useBoardStore()
const message = useMessage()

// State
const isGenerating = ref(false)
const selectedProfile = ref<RepertoireProfile>('amateur')
const selectedStyle = ref<RepertoireStyle>('master')

const styleOptions = [
  {
    label: '🏛️ GrossMaster',
    value: 'grossmaster',
    description: 'Maximum reliability and theoretical soundness. The elite choice.',
  },
  {
    label: '🏆 Master',
    value: 'master',
    description: 'Professional growth with a focus on winning chances. Balanced and strong.',
  },
  {
    label: '🃏 The Hustler',
    value: 'hustler',
    description: 'Sharp traps, "poisonous" lines, and provocative play. Play to win at all costs.',
  },
]

const profileOptions = [
  { label: 'Amateur (Standard)', value: 'amateur' },
  { label: 'Club (Advanced)', value: 'club' },
  { label: 'Tournament (Elite)', value: 'tournament' },
]

const selectedStyleCleanName = computed(() => {
  const opt = styleOptions.find((s) => s.value === selectedStyle.value)
  return opt ? opt.label.split(' ').slice(1).join(' ') : ''
})

const handleGenerateRepertoire = async () => {
  if (!studyStore.activeChapter || !studyStore.activeChapter.color) {
    message.warning('Please set the chapter color first (in Study Manager).')
    return
  }

  isGenerating.value = true
  const styleLabel =
    styleOptions.find((s) => s.value === selectedStyle.value)?.label || selectedStyle.value

  try {
    const currentPgn = pgnService.getCurrentPgnString({ showVariations: false })
    const request: RepertoireRequest = {
      start_pgn: currentPgn,
      color: studyStore.activeChapter.color as 'white' | 'black',
      profile: selectedProfile.value,
      style: selectedStyle.value,
    }

    const pgn = await repertoireApiService.generateRepertoire(request)
    if (pgn) {
      const { root: parsedRoot } = pgnParserService.parse(pgn)

      // Find the node in parsedRoot that corresponds to our current position
      // The generated PGN usually starts from the initial position or the start_pgn
      // We need to carefully merge.
      // Usually, the generator returns a line starting from the request position or root.
      // Assuming it returns PGN from root:

      let sourceNode = parsedRoot
      const currentPly = pgnService.getCurrentPly()

      // Traverse to current ply in the generated tree if possible
      // (This assumes the generated PGN matches the current game history)
      for (let i = 0; i < currentPly; i++) {
        const firstChild: PgnNode | undefined = sourceNode.children[0]
        if (firstChild) {
          sourceNode = firstChild
        } else {
          break
        }
      }

      pgnService.mergeSubtree(pgnService.getCurrentNode(), sourceNode)
      boardStore.syncBoardWithPgn()

      message.success(`${styleLabel} repertoire integrated!`)
      emit('update:show', false)
    } else {
      message.error('Failed to generate repertoire')
    }
  } catch (e: unknown) {
    const error = e as Error
    console.error(error)
    message.error(error.message || 'An error occurred during generation')
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <NModal
    :show="show"
    @update:show="(v) => emit('update:show', v)"
    preset="card"
    title="Generate Repertoire"
    style="width: 500px; max-width: 95vw"
  >
    <NSpace vertical size="large">
      <div v-if="studyStore.activeChapter?.color">
        Generating for <strong>{{ studyStore.activeChapter.color }}</strong> from current position.
      </div>
      <div v-else class="warning-text">
         Warning: Chapter color is not set. Please set it in Study Manager.
      </div>

      <!-- Profile Selector -->
      <label>Target Level:</label>
      <NSelect v-model:value="selectedProfile" :options="profileOptions" />

      <!-- Style Selector -->
      <label>Play Style:</label>
      <div class="style-list">
        <div
          v-for="s in styleOptions"
          :key="s.value"
          class="style-card"
          :class="{ active: selectedStyle === s.value }"
          @click="selectedStyle = s.value as RepertoireStyle"
        >
          <div class="style-header">{{ s.label }}</div>
          <div class="style-desc">{{ s.description }}</div>
        </div>
      </div>

      <NSpace justify="end">
        <NButton @click="emit('update:show', false)">Cancel</NButton>
        <NButton
            type="primary"
            :loading="isGenerating"
            :disabled="!studyStore.activeChapter?.color"
            @click="handleGenerateRepertoire"
        >
          <template #icon><NIcon><FlashOutline /></NIcon></template>
          Generate {{ selectedStyleCleanName }}
        </NButton>
      </NSpace>
    </NSpace>
  </NModal>
</template>

<style scoped>
.style-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.style-card {
  border: 1px solid var(--color-border);
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-bg-secondary);
}

.style-card:hover {
  border-color: var(--color-accent-primary);
  background: rgba(var(--color-accent-primary-rgb), 0.05);
}

.style-card.active {
  border-color: var(--color-accent-primary);
  background: rgba(var(--color-accent-primary-rgb), 0.1);
  box-shadow: 0 0 0 1px var(--color-accent-primary);
}

.style-header {
  font-weight: bold;
  font-size: 1.1em;
  margin-bottom: 4px;
}

.style-desc {
  font-size: 0.9em;
  color: var(--color-text-secondary);
}

.warning-text {
    color: #ff5252;
}
</style>
