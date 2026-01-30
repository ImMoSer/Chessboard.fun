<!-- src/views/OpeningTrainingView.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GameLayout from '../components/GameLayout.vue'
import OpeningTrainingSettingsModal from '../components/OpeningTrainer/OpeningTrainingSettingsModal.vue'
import MozerBook from '../components/OpeningTrainer/MozerBook.vue'
import { NModal, NButton, NIcon, NStatistic, NNumberAnimation } from 'naive-ui'
import { ArrowBack, DiamondOutline, FlashOutline } from '@vicons/ionicons5'
import { useAnalysisStore } from '../stores/analysis.store'
import { useBoardStore } from '../stores/board.store'
import { useGameStore } from '../stores/game.store'
import { useOpeningTrainingStore } from '../stores/openingTraining.store'
import { useDiamondHunterStore } from '../stores/diamondHunter.store'

const openingStore = useOpeningTrainingStore()
const diamondHunterStore = useDiamondHunterStore()
const boardStore = useBoardStore()
const gameStore = useGameStore()
const analysisStore = useAnalysisStore()
const router = useRouter()
const route = useRoute()

const isSettingsModalOpen = ref(true)
let navigationDebounce: ReturnType<typeof setTimeout> | null = null

// Sync Opening Stats with Board Position (Debounced for Navigation)
watch(
  () => boardStore.fen,
  async () => {
    // Diamond Hunter Logic
    if (openingStore.isDiamondMode && diamondHunterStore.isActive) {
       // If it is User's turn, update arrows
       if (boardStore.turn === analysisStore.playerColor) {
           await diamondHunterStore.updateArrows()
       } else {
           // If it is Bot's turn, trigger bot move
           await diamondHunterStore.botMove()
       }
    }

    if (navigationDebounce) clearTimeout(navigationDebounce)

    navigationDebounce = setTimeout(() => {
        // Minimal fetch just to ensure we have data if needed??
        // Actually diamondHunterStore fetches its own stats in updateArrows/botMove.
        // We might not need openingStore.fetchStats at all anymore.
    }, 100)
  },
)

onMounted(async () => {
  openingStore.reset()
  // Force Diamond Mode
  openingStore.isDiamondMode = true

  // openingStore.initializeSession might do too much setup we don't need (like graph loading)
  // But we need board setup.

  if (route.params.color) {
      await handleRouteParams()
  }
})

async function handleRouteParams() {
  const colorParam = route.params.color as string | undefined
  let color: 'white' | 'black' = 'white'

  if (colorParam) {
    const normalized = colorParam.replace('for_', '')
    if (normalized === 'white' || normalized === 'black') {
      color = normalized
    }
  }

  await startSession(color)
}

onUnmounted(() => {
  openingStore.reset()
  diamondHunterStore.stopHunt()
  analysisStore.setPlayerColor(null)
  gameStore.resetGame()
})

async function startSession(color: 'white' | 'black') {
  isSettingsModalOpen.value = false
  analysisStore.setPlayerColor(color)
  // analysisStore.showPanel() // Maybe hide analysis panel initiates to keep it clean?
  // User said "other functions not needed". Analysis might give away answers.
  // Although "Solving" phase assumes user finds move. Analysis engine would cheat.
  // So likely hide analysis.
  analysisStore.hidePanel()
  openingStore.isDiamondMode = true

  router.replace({
      name: 'opening-training',
      params: { color: `for_${color}` },
  })


  gameStore.setupPuzzle(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    [],
    () => {},
    () => false,
    () => {},
    'opening-trainer',
    undefined,
    color,
    (uci) => {
      if (diamondHunterStore.isSolving) {
         diamondHunterStore.handleUserSolvingMove(uci)
      } else {
         // In Hunt mode, user just moves.
         // We might want to validate move legality via boardStore, which handles it.
         // But we usually need to update state.
         // Check if boardStore.handleUserMove was called?
         // gameStore.handleUserMove calls this callback.
         // So the move is already applied on board if legitimate.
      }
    },
  )

  // Initialize board only
  boardStore.setupPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', color)

  diamondHunterStore.startHunt()
  // Initial Arrows or Bot Move
  if (boardStore.turn === color) {
      diamondHunterStore.updateArrows()
  } else {
      diamondHunterStore.botMove()
  }
}

async function handleRestart() {
    openingStore.reset()
    diamondHunterStore.stopHunt()
    await gameStore.resetGame()
    isSettingsModalOpen.value = true
}

function goBack() {
    router.push({ name: 'home' })
}
</script>

<template>
  <GameLayout>
    <template #left-panel>
        <!-- Minimal Header -->
      <div class="diamond-header">
          <div class="header-top">
              <n-button circle secondary @click="goBack">
                  <template #icon><n-icon><ArrowBack /></n-icon></template>
              </n-button>
              <div class="title">Diamond Hunter</div>
          </div>
          
          <div class="status">
              <div v-if="diamondHunterStore.state === 'HUNTING'">
                 Hunting...
              </div>
              <div v-else-if="diamondHunterStore.state === 'SOLVING'" style="color: #ff5252">
                 PUNISH THE BLUNDER!
              </div>
          </div>

          <!-- Session Stats -->
          <div class="stats-row">
              <n-statistic label="Diamonds">
                <template #prefix>
                    <n-icon color="#9C27B0"><DiamondOutline /></n-icon>
                </template>
                <n-number-animation :from="0" :to="diamondHunterStore.sessionDiamonds" />
              </n-statistic>

              <n-statistic label="Brilliants">
                <template #prefix>
                    <n-icon color="#00C853"><FlashOutline /></n-icon>
                </template>
                <n-number-animation :from="0" :to="diamondHunterStore.sessionBrilliants" />
              </n-statistic>
          </div>

           <n-button type="primary" secondary @click="handleRestart" style="margin-top: 20px; width: 100%">
              Restart Session
          </n-button>
      </div>

      <OpeningTrainingSettingsModal
        v-if="isSettingsModalOpen"
        @start="startSession"
        @close="() => {}"
      />
    </template>

    <template #center-column>
      <!-- Reward Modal -->
      <n-modal v-model:show="diamondHunterStore.isActive" :preset="'dialog'" v-if="diamondHunterStore.message && diamondHunterStore.state === 'REWARD'" style="width: 400px; text-align: center;">
         <template #header>
            <div style="font-size: 1.2rem; font-weight: bold; color: #00C853">{{ 'Diamond Collected!' }}</div>
         </template>
         <div style="font-size: 3rem; margin: 20px 0;">💎</div>
         <div style="font-size: 1.1rem; margin-bottom: 20px;">{{ diamondHunterStore.message }}</div>
         <n-button type="primary" @click="diamondHunterStore.stopHunt(); handleRestart()">Next Hunt</n-button>
      </n-modal>

       <!-- Fail Modal -->
      <n-modal v-model:show="diamondHunterStore.isActive" :preset="'dialog'" v-if="diamondHunterStore.message && diamondHunterStore.state === 'IDLE' && diamondHunterStore.message.includes('lost')" style="width: 400px; text-align: center;">
         <template #header>
            <div style="font-size: 1.2rem; font-weight: bold; color: #D32F2F">{{ 'Diamond Lost!' }}</div>
         </template>
          <div style="font-size: 3rem; margin: 20px 0;">❌</div>
         <div style="font-size: 1.1rem; margin-bottom: 20px;">{{ diamondHunterStore.message }}</div>
          <n-button type="primary" @click="diamondHunterStore.stopHunt(); handleRestart()">Try Again</n-button>
      </n-modal>

    </template>

    <template #right-panel>
       <MozerBook />
    </template>
  </GameLayout>
</template>

<style scoped lang="scss">
.diamond-header {
    background: var(--color-bg-secondary);
    padding: 20px;
    border-radius: 12px;
    color: var(--color-text-primary);
}

.header-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.title {
    font-size: 1.2rem;
    font-weight: bold;
    color: #00C853;
}

.status {
    font-size: 1rem;
    font-weight: 500;
    padding: 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    text-align: center;
    margin-bottom: 15px;
}

.stats-row {
    display: flex;
    justify-content: space-around;
    background: rgba(0, 0, 0, 0.2);
    padding: 10px;
    border-radius: 8px;
}

.right-panel-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 400px;
}
</style>
