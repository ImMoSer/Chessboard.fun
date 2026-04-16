<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalysisEngineStore } from '@/entities/analysis'
import { changeLang } from '@/shared/config/i18n'
import logger from '@/shared/lib/logger'

const emit = defineEmits<{
  (e: 'ready'): void
}>()

const isReady = ref(false)
const showLoaderUI = ref(false)
const isWarming = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const progress = ref(0)
const warmingProgress = ref(0)
const loadedBytes = ref(0)
const totalBytes = ref(0) // Will be updated during fetch

const { t, locale } = useI18n({ useScope: 'global' })

const handleChangeLang = (lang: 'en' | 'ru' | 'de') => {
  changeLang(lang)
}

const loadedMb = computed(() => (loadedBytes.value / 1024 / 1024).toFixed(1))
const totalMb = computed(() => (totalBytes.value / 1024 / 1024).toFixed(1))

// The assets we want to explicitly preload and cache
const CACHE_NAME = 'stockfish-assets-v1'
const assetsToLoad = [
  '/npm_stockfish/sf_1807_multi_lite/stockfish-18-lite.js',
  '/npm_stockfish/sf_1807_multi_lite/stockfish-18-lite.wasm',
  '/npm_stockfish/sf_1807_single_lite/stockfish-18-lite-single.js',
  '/npm_stockfish/sf_1807_single_lite/stockfish-18-lite-single.wasm',
]

async function preloadAssets() {
  const tTotalStart = performance.now()
  let uiShownTime: number | null = null

  logger.info('[LoaderProfiler] Starting global asset loading sequence...')
  hasError.value = false
  errorMessage.value = ''
  
  // Show the loader UI only if initialization takes more than 500ms
  setTimeout(() => {
    if (!isReady.value && !hasError.value) {
      showLoaderUI.value = true
      uiShownTime = performance.now()
      logger.debug(`[LoaderProfiler] UI Progress Bar rendered (500ms threshold reached).`)
    }
  }, 500)

  try {
    const tEnvStart = performance.now()
    if (typeof SharedArrayBuffer === 'undefined' || !('caches' in window)) {
      throw new Error('Critical Environment checks failed (SharedArrayBuffer or caches missing).')
    }
    const tEnvEnd = performance.now()
    logger.debug(`[LoaderProfiler] Secondary Environment check passed in ${(tEnvEnd - tEnvStart).toFixed(2)}ms`)

    // Clear old caches if they exist
    const cacheNames = await caches.keys()
    for (const name of cacheNames) {
      if (name.startsWith('stockfish-assets') && name !== CACHE_NAME) {
        logger.info(`[LoaderProfiler] Deleting old cache: ${name}`)
        await caches.delete(name)
      }
    }

    const cache = await caches.open(CACHE_NAME)

    // Hardcoded expected total size for approximately 15.5 MB
    totalBytes.value = 15.5 * 1024 * 1024
    let currentLoaded = 0

    // Fetch files directly without HEAD request
    const tFetchTotalStart = performance.now()
    for (const url of assetsToLoad) {
      const tFileStart = performance.now()
      
      const cachedResponse = await cache.match(url)
      
      if (cachedResponse) {
        // Approximate the cached file size linearly for the bar
        const approxSize = url.endsWith('.wasm') ? 7 * 1024 * 1024 : 0.5 * 1024 * 1024
        currentLoaded += approxSize
        loadedBytes.value = Math.min(currentLoaded, totalBytes.value)
        progress.value = Math.min(Math.round((loadedBytes.value / totalBytes.value) * 100), 99)
        
        const tFileEnd = performance.now()
        logger.info(`[LoaderProfiler] LOADED FROM CACHE: [${url}] in ${(tFileEnd - tFileStart).toFixed(2)}ms.`)
        continue
      }

      // Not cached, so download from network
      const fetchResponse = await fetch(url)
      if (!fetchResponse.ok) {
        throw new Error(`Asset failed to load: ${url} (${fetchResponse.status} ${fetchResponse.statusText})`)
      }
      
      // Explicitly put in Cache API
      await cache.put(url, fetchResponse.clone())

      if (!fetchResponse.body) continue

      const reader = fetchResponse.body.getReader()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          currentLoaded += value.length
          loadedBytes.value = Math.min(currentLoaded, totalBytes.value)
          progress.value = Math.min(Math.round((loadedBytes.value / totalBytes.value) * 100), 99)
        }
      }
      
      const tFileEnd = performance.now()
      logger.info(`[LoaderProfiler] DOWNLOADED FROM NETWORK: [${url}] in ${(tFileEnd - tFileStart).toFixed(2)}ms.`)
    }
    const tFetchTotalEnd = performance.now()
    logger.info(`[LoaderProfiler] All assets fetched/loaded in ${(tFetchTotalEnd - tFetchTotalStart).toFixed(2)}ms.`)

    // 3. Engine Warming (Compiling WASM & Handshake) - NOW IN BACKGROUND
    logger.info(`[LoaderProfiler] Starting Engine Warming Phase (WASM compilation & UCI Handshake) IN BACKGROUND...`)
    
    isReady.value = true
    emit('ready') // Freigabe der UI sofort nach Phase 1 (Data Fetch).
    
    const tTotalEnd = performance.now()
    logger.info(`[LoaderProfiler] SUCCESS! Data fetch sequence completed in ${(tTotalEnd - tTotalStart).toFixed(2)}ms.`)
    if (uiShownTime !== null) {
      logger.debug(`[LoaderProfiler] Progress Bar UI was visible to the user for ${(tTotalEnd - uiShownTime).toFixed(2)}ms. (Phase 1 only)`)
    } else {
      logger.debug(`[LoaderProfiler] Progress Bar UI was NOT shown (boot without network fetch was faster than 500ms).`)
    }

    const tWarmStart = performance.now()
    useAnalysisEngineStore().initialize().then(() => {
      const tWarmEnd = performance.now()
      logger.info(`[LoaderProfiler] Engine Background-Warming completed smoothly in ${(tWarmEnd - tWarmStart).toFixed(2)}ms.`)
    }).catch((warmError) => {
      console.warn('[LoaderProfiler] Engine warming failed in background:', warmError)
    })

  } catch (error) {
    const tFail = performance.now()
    logger.error(`[LoaderProfiler] FATAL ERROR during boot sequence after ${(tFail - tTotalStart).toFixed(2)}ms:`, error)
    hasError.value = true
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
}

const handleRetry = () => {
  preloadAssets()
}

onMounted(() => {
  preloadAssets()
})
</script>

<template>
  <!-- Error Screen -->
  <div v-if="hasError" class="global-loader-wrapper">
    <div class="loader-content webview-blocker">
      <img src="/png/extra_pawn_black.png" alt="Logo" class="loader-logo static" />
      <h2 class="loader-title error-text">{{ t('common.actions.error') }}</h2>
      <p class="loader-text">
        {{ t('app.globalLoader.error') }}
      </p>
      <p v-if="errorMessage" class="loader-hint" style="margin-bottom: 20px; color: #ff4d4f;">
        {{ errorMessage }}
      </p>
      
      <button @click="handleRetry" class="copy-button">
        {{ t('common.actions.retry') }}
      </button>

      <div class="loader-lang-switcher">
        <button class="lang-btn" :class="{ active: locale === 'en' }" @click="handleChangeLang('en')">EN</button>
        <span class="lang-divider">|</span>
        <button class="lang-btn" :class="{ active: locale === 'ru' }" @click="handleChangeLang('ru')">RU</button>
        <span class="lang-divider">|</span>
        <button class="lang-btn" :class="{ active: locale === 'de' }" @click="handleChangeLang('de')">DE</button>
      </div>
    </div>
  </div>

  <!-- Normal Asset Loader Screen -->
  <div v-else-if="!isReady" class="global-loader-wrapper">
    <div v-if="showLoaderUI" class="loader-content">
      <img src="/png/extra_pawn_black.png" alt="Logo" class="loader-logo" />
      <h2 class="loader-title">EXTRAPAWN</h2>
      
      <p class="loader-text">
        {{ isWarming ? t('app.globalLoader.warmingMessage') : t('app.globalLoader.message') }}
      </p>
      
      <div class="progress-container">
        <div 
          class="progress-bar" 
          :class="{ 'is-warming': isWarming }" 
          :style="{ width: (isWarming ? warmingProgress : progress) + '%' }"
        ></div>
      </div>
      
      <div class="loader-detail">
        <span v-if="!isWarming && totalBytes > 0">{{ loadedMb }} MB / {{ totalMb }} MB</span>
        <span v-else>{{ isWarming ? warmingProgress : progress }}%</span>
      </div>
      
      <p class="loader-hint">
        {{ isWarming ? t('app.globalLoader.warmingHint') : t('app.globalLoader.hint') }}
      </p>

      <div class="loader-lang-switcher">
        <button class="lang-btn" :class="{ active: locale === 'en' }" @click="handleChangeLang('en')">EN</button>
        <span class="lang-divider">|</span>
        <button class="lang-btn" :class="{ active: locale === 'ru' }" @click="handleChangeLang('ru')">RU</button>
        <span class="lang-divider">|</span>
        <button class="lang-btn" :class="{ active: locale === 'de' }" @click="handleChangeLang('de')">DE</button>
      </div>
    </div>
  </div>
  <slot v-else></slot>
</template>

<style scoped>
.global-loader-wrapper {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0b0d17; /* Dark space background */
  z-index: 99999;
  color: #fff;
  font-family: 'Ubuntu', sans-serif;
}

.loader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 400px;
  width: 90%;
  text-align: center;
  padding: 40px;
  background: rgba(15, 17, 26, 0.45);
  border: 1px solid rgba(0, 242, 255, 0.15);
  border-radius: 24px;
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.loader-logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin-bottom: 20px;
  animation: pulse 2s infinite ease-in-out;
}

.loader-title {
  font-size: 1.5rem;
  letter-spacing: 0.1em;
  margin: 0 0 16px 0;
  color: #00f2ff;
  text-shadow: 0 0 10px rgba(0, 242, 255, 0.4);
}

.loader-text {
  font-size: 1rem;
  color: #a0aec0;
  margin-bottom: 30px;
  line-height: 1.5;
}

.progress-container {
  width: 100%;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #00f2ff, #0088ff);
  border-radius: 4px;
  transition: width 0.3s ease;
  box-shadow: 0 0 10px #00f2ff;
}

.progress-bar.is-warming {
  background: linear-gradient(90deg, #8a2be2, #4b0082); /* Purple/Indigo for warming */
  box-shadow: 0 0 10px #8a2be2;
}

.loader-detail {
  font-size: 0.9rem;
  color: #00f2ff;
  font-weight: 600;
  margin-bottom: 16px;
}

.loader-hint {
  font-size: 0.8rem;
  color: #718096;
  margin: 0;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

.loader-logo.static {
  animation: none;
  opacity: 1;
}

.webview-blocker {
  border-color: rgba(255, 60, 60, 0.4);
  box-shadow: 0 8px 32px rgba(255, 60, 60, 0.2);
}

.copy-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}

.copy-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  font-size: 0.9rem;
  text-align: center;
  outline: none;
  cursor: default;
}

.copy-button {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 24px;
  background: #00f2ff;
  border: none;
  border-radius: 12px;
  color: #0b0d17;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Ubuntu', sans-serif;
}

.copy-button:hover {
  background: #0088ff;
  box-shadow: 0 0 15px rgba(0, 242, 255, 0.4);
}

.copy-button.is-copied {
  background: #27ae60;
  color: #fff;
}

.error-text {
  color: #ff4d4f;
  text-shadow: 0 0 10px rgba(255, 77, 79, 0.4);
}

.loader-lang-switcher {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  width: 100%;
}

.lang-btn {
  background: none;
  border: none;
  color: #718096;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  transition: all 0.2s ease;
  font-family: 'Ubuntu', sans-serif;
}

.lang-btn:hover {
  color: #fff;
}

.lang-btn.active {
  color: #00f2ff;
}

.lang-divider {
  color: rgba(255, 255, 255, 0.1);
  font-size: 0.8rem;
}
</style>
