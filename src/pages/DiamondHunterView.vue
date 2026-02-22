<!-- src/pages/OpeningTrainingView.vue -->
<script setup lang="ts">
import { useBoardStore } from '@/entities/board'
import { useGameStore } from '@/entities/game'
import { useAnalysisStore } from '@/features/analysis/model/analysis.store'
import AnalysisPanel from '@/features/analysis/ui/AnalysisPanel.vue'
import { useDiamondHunterStore } from '@/features/diamond-hunter/model/diamondHunter.store'
import DiamondHunterSettingsModal from '@/features/diamond-hunter/ui/DiamondHunterSettingsModal.vue'
import GravityBook from '@/features/diamond-hunter/ui/GravityBook.vue'
import { ArrowBack, DiamondOutline, FlashOutline, TelescopeOutline } from '@vicons/ionicons5'
import { NButton, NIcon, NModal, NNumberAnimation, NSpace, NStatistic } from 'naive-ui'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GameLayout from '../widgets/game-layout/GameLayout.vue'


const diamondHunterStore = useDiamondHunterStore()
const boardStore = useBoardStore()
const gameStore = useGameStore()
const analysisStore = useAnalysisStore()
const router = useRouter()
const route = useRoute()

const isSettingsModalOpen = ref(true)
const isAnalysisView = ref(false)

// Redundant FEN watcher removed.
// Logic moved to diamondHunterStore.handleUserMove (via gameStore callback)
// and explicit calls in startSession / handleSaveMove.

onMounted(async () => {
  diamondHunterStore.reset()

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
  diamondHunterStore.stopHunt()
  analysisStore.setPlayerColor(null)
  gameStore.resetGame()
})

async function startSession(color: 'white' | 'black') {
  isSettingsModalOpen.value = false
  isAnalysisView.value = false
  analysisStore.setPlayerColor(color)
  // analysisStore.showPanel() // Maybe hide analysis panel initiates to keep it clean?
  // User said "other functions not needed". Analysis might give away answers.
  // Although "Solving" phase assumes user finds move. Analysis engine would cheat.
  // So likely hide analysis.
  analysisStore.hidePanel()
  gameStore.shouldAutoPlayBot = false

  router.replace({
      name: 'diamond-hunter',
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
        } else if (diamondHunterStore.state === 'SAVING') {
           diamondHunterStore.handleSaveMove(uci)
        } else if (diamondHunterStore.state === 'HUNTING') {
           diamondHunterStore.handleHuntMove(uci)
        }
      },
      undefined,
      false, // autoPlayBot: false to prevent conflict with DiamondHunterStore's own bot logic
      true // keepPgn: true
    )

  // Initialize board only
  boardStore.setupPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', color)

  diamondHunterStore.startHunt()

  // Manual Trigger: If it is not user's turn, force bot move.
  // The watcher might have missed the initial state change if it happened before HUNTING mode.
  if (boardStore.turn !== color) {
       await diamondHunterStore.botMove()
  } else {
       await diamondHunterStore.updateArrows()
  }
}

async function handleRestart() {
    diamondHunterStore.stopHunt()
    isAnalysisView.value = false
    await gameStore.resetGame()
    isSettingsModalOpen.value = true
}

function startAnalysis() {
    diamondHunterStore.stopHunt()
    isAnalysisView.value = true
    analysisStore.showPanel(true)
}

function goBack() {
    router.push({ name: 'welcome' })
}
</script>

<template>
  <GameLayout>
    <template #top-info>
      <TopInfoPanel />
    </template>

    <template #left-panel>
        <!-- Analysis Mode -->
        <div v-if="isAnalysisView" class="analysis-container">
            <n-button secondary type="primary" @click="handleRestart" style="margin-bottom: 10px; width: 100%">
                <template #icon><n-icon><ArrowBack /></n-icon></template>
                Back to Hunt
            </n-button>
            <AnalysisPanel />
        </div>

        <!-- Minimal Header (Hunt Mode) -->
      <div v-else class="diamond-header">
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
              <div v-else-if="diamondHunterStore.state === 'SAVING'" style="color: #448AFF">
                 Secure Diamond: Replay from memory!
              </div>
          </div>

          <!-- Session Stats -->
          <div class="stats-row">
              <n-statistic label="Total Diamonds">
                <template #prefix>
                    <n-icon color="#9C27B0"><DiamondOutline /></n-icon>
                </template>
                <n-number-animation :from="0" :to="diamondHunterStore.totalDiamonds" />
              </n-statistic>

              <n-statistic label="Total Brilliants">
                <template #prefix>
                    <n-icon color="#00C853"><FlashOutline /></n-icon>
                </template>
                <n-number-animation :from="0" :to="diamondHunterStore.totalBrilliants" />
              </n-statistic>
          </div>

           <n-button type="primary" secondary @click="handleRestart" style="margin-top: 20px; width: 100%">
              Restart Session
          </n-button>
      </div>

      <DiamondHunterSettingsModal
        v-if="isSettingsModalOpen"
        @start="startSession"
        @close="goBack"
      />
    </template>

    <template #center-column>
       <!-- Theory Ended Modal -->
      <n-modal v-model:show="diamondHunterStore.showTheoryEndModal" :preset="'dialog'" style="width: 400px; text-align: center;">
         <template #header>
            <div style="font-size: 1.2rem; font-weight: bold; color: #FFA000">{{ 'Theory Ended' }}</div>
         </template>
         <div style="font-size: 3rem; margin: 20px 0;">🤷‍♂️</div>
         <div style="font-size: 1.1rem; margin-bottom: 20px;">We are out of book moves.</div>

         <n-space justify="center" :size="20">
             <n-button type="primary" @click="diamondHunterStore.closeTheoryModal(); handleRestart()">Restart</n-button>
             <n-button secondary @click="diamondHunterStore.closeTheoryModal(); startAnalysis()">
                 <template #icon><n-icon><TelescopeOutline /></n-icon></template>
                 Analyze
             </n-button>
         </n-space>
      </n-modal>

      <!-- Reward Modal -->
      <n-modal v-model:show="diamondHunterStore.isActive" :preset="'dialog'" v-if="diamondHunterStore.message && diamondHunterStore.state === 'REWARD'" style="width: 400px; text-align: center;">
         <template #header>
            <div style="font-size: 1.2rem; font-weight: bold; color: #00C853">{{ 'Diamond Found!' }}</div>
         </template>
         <div style="font-size: 3rem; margin: 20px 0;">💎</div>
         <div style="font-size: 1.1rem; margin-bottom: 20px;">{{ diamondHunterStore.message }}</div>

         <n-space justify="center" :size="20">
             <!-- If we have moves to replay (meaning we just found it initially), offer Secure option -->
             <n-button
                v-if="diamondHunterStore.savingMoves.length > 0"
                type="primary"
                @click="diamondHunterStore.startSaveRun()"
             >
                Secure Diamond (Replay)
             </n-button>

             <!-- Fallback or if already secured (moves cleared) -->
             <n-button
                v-else
                type="primary"
                @click="diamondHunterStore.stopHunt(); handleRestart()"
             >
                Next Hunt
             </n-button>

             <n-button secondary @click="startAnalysis">
                 <template #icon><n-icon><TelescopeOutline /></n-icon></template>
                 Analyze
             </n-button>
         </n-space>
      </n-modal>

       <!-- Fail Modal -->
      <n-modal v-model:show="diamondHunterStore.isActive" :preset="'dialog'" v-if="diamondHunterStore.message && diamondHunterStore.state === 'FAILED'" style="width: 400px; text-align: center;">
         <template #header>
            <div style="font-size: 1.2rem; font-weight: bold; color: #D32F2F">{{ 'Diamond Lost!' }}</div>
         </template>
          <div style="font-size: 3rem; margin: 20px 0;">❌</div>
         <div style="font-size: 1.1rem; margin-bottom: 20px;">{{ diamondHunterStore.message }}</div>

         <n-space justify="center" :size="20">
             <n-button type="primary" @click="diamondHunterStore.stopHunt(); handleRestart()">Try Again</n-button>
             <n-button secondary @click="startAnalysis">
                 <template #icon><n-icon><TelescopeOutline /></n-icon></template>
                 Analyze
             </n-button>
         </n-space>
      </n-modal>

    </template>

    <template #right-panel>
       <GravityBook />
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
