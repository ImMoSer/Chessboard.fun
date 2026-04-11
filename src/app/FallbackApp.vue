<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { changeLang } from '@/shared/config/i18n'

const { t, locale } = useI18n({ useScope: 'global' })
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
</script>

<template>
  <div class="global-loader-wrapper">
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
</template>

<style scoped>
.global-loader-wrapper {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0b0d17;
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

.loader-logo.static {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin-bottom: 20px;
  opacity: 1;
}

.loader-title {
  font-size: 1.5rem;
  letter-spacing: 0.1em;
  margin: 0 0 16px 0;
  color: #00f2ff;
  text-shadow: 0 0 10px rgba(0, 242, 255, 0.4);
}

.error-text {
  color: #ff4d4f;
  text-shadow: 0 0 10px rgba(255, 77, 79, 0.4);
}

.loader-text {
  font-size: 1rem;
  color: #a0aec0;
  margin-bottom: 30px;
  line-height: 1.5;
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

.loader-hint {
  font-size: 0.8rem;
  color: #718096;
  margin: 0;
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