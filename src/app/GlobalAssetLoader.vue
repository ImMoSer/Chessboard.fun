<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { DEFAULT_NNUE_FILE } from '@/shared/config/engine.constants'
import { changeLang } from '@/shared/config/i18n'

const emit = defineEmits<{
  (e: 'ready'): void
}>()

const isReady = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const progress = ref(0)
const loadedBytes = ref(0)
const totalBytes = ref(0) // Will be updated during fetch

const { t, locale } = useI18n({ useScope: 'global' })

const isWebview = ref(false)
const appUrl = window.location.origin
const copied = ref(false)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(appUrl)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const handleChangeLang = (lang: 'en' | 'ru' | 'de') => {
  changeLang(lang)
}

const loadedMb = computed(() => (loadedBytes.value / 1024 / 1024).toFixed(1))
const totalMb = computed(() => (totalBytes.value / 1024 / 1024).toFixed(1))

// The assets we want to explicitly preload and cache
const CACHE_NAME = 'stockfish-assets'
const assetsToLoad = [
  `/stockfish/nnue/${DEFAULT_NNUE_FILE}`,
  '/stockfish/nnue/sf_18_smallnet.wasm',
  '/stockfish/single/stockfish-18-lite-single.wasm',
]

async function preloadAssets() {
  hasError.value = false
  errorMessage.value = ''
  
  try {
    // 0. Environment Compatibility Check (Kill-Switch)
    // We require:
    // - SharedArrayBuffer for Stockfish (WASM Multi-threading)
    // - IndexedDB for local storage & state persistence
    // - Cache API for ServiceWorker/Offline functionality
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'
    const hasIndexedDB = !!window.indexedDB
    const hasCacheApi = 'caches' in window

    if (!hasSharedArrayBuffer || !hasIndexedDB || !hasCacheApi) {
      isWebview.value = true
      return // Stop loading, show incompatibility/webview block screen
    }

    const cache = await caches.open(CACHE_NAME)

    // 1. Parallelize size checks (Check Cache API first, then HEAD)
    const sizePromises = assetsToLoad.map(async (url) => {
      try {
        const cachedResponse = await cache.match(url)
        if (cachedResponse) {
          const size = parseInt(cachedResponse.headers.get('content-length') || '0', 10)
          return { url, size, cached: true }
        }
        
        const res = await fetch(url, { method: 'HEAD' })
        const size = parseInt(res.headers.get('content-length') || '0', 10)
        return { url, size, cached: false }
      } catch (e) {
        console.warn('Failed to get size for', url, e)
        return { url, size: 0, cached: false }
      }
    })

    const assetInfos = await Promise.all(sizePromises)
    let totalSize = assetInfos.reduce((acc, info) => acc + info.size, 0)

    // Add some arbitrarily chosen size for sounds assuming they load in background
    const EXPECTED_SOUNDS_SIZE = 3 * 1024 * 1024 // ~3MB
    totalSize += EXPECTED_SOUNDS_SIZE
    totalBytes.value = totalSize

    let currentLoaded = 0

    // 2. Fetch files with progress
    for (const info of assetInfos) {
      if (info.size === 0 && !info.cached) continue

      let response: Response
      
      if (info.cached) {
        response = (await cache.match(info.url))!
      } else {
        const fetchResponse = await fetch(info.url)
        if (!fetchResponse.ok) throw new Error(`Failed to fetch ${info.url}: ${fetchResponse.statusText}`)
        
        // Explicitly put in Cache API
        await cache.put(info.url, fetchResponse.clone())
        response = fetchResponse
      }

      if (!response.body) continue
      const reader = response.body.getReader()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          currentLoaded += value.length
          loadedBytes.value = currentLoaded
          progress.value = Math.min(Math.round((currentLoaded / totalBytes.value) * 100), 99)
        }
      }
    }

    // Finalize progress
    currentLoaded += EXPECTED_SOUNDS_SIZE
    loadedBytes.value = currentLoaded
    progress.value = 100
    
    setTimeout(() => {
      isReady.value = true
      emit('ready')
    }, 500)

  } catch (error) {
    console.error('Error preloading assets:', error)
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
  <!-- WebView Blocker Screen -->
  <div v-if="isWebview" class="global-loader-wrapper">
    <div class="loader-content webview-blocker">
      <img src="/png/extra_pawn_black.png" alt="Logo" class="loader-logo static" />
      <h2 class="loader-title error-text">OOPS!</h2>
      <p class="loader-text">
        {{ t('app.globalLoader.webviewWarning') }}
      </p>
      
      <div class="copy-section">
        <input type="text" readonly :value="appUrl" class="copy-input" />
        <button @click="copyLink" class="copy-button" :class="{ 'is-copied': copied }">
          {{ copied ? t('common.actions.copied') : t('common.actions.copyLink') }}
        </button>
      </div>
      
      <p class="loader-hint" style="margin-top: 20px;">
        {{ t('app.globalLoader.webviewAction') }}
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

  <!-- Error Screen -->
  <div v-else-if="hasError" class="global-loader-wrapper">
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
    <div class="loader-content">
      <img src="/png/extra_pawn_black.png" alt="Logo" class="loader-logo" />
      <h2 class="loader-title">EXTRAPAWN</h2>
      <p class="loader-text">
        {{ t('app.globalLoader.message') }}
      </p>
      
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
      </div>
      
      <div class="loader-detail">
        <span v-if="totalBytes > 0">{{ loadedMb }} MB / {{ totalMb }} MB</span>
        <span v-else>{{ progress }}%</span>
      </div>
      <p class="loader-hint">{{ t('app.globalLoader.hint') }}</p>

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
