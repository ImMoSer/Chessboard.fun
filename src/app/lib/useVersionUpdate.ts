import { useDialog } from 'naive-ui'
import { onMounted, onUnmounted } from 'vue'

export function useVersionUpdate() {
  const dialog = useDialog()
  const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION
  
  // Intervall für den Check (alle 10 Minuten)
  let checkInterval: ReturnType<typeof setInterval> | null = null

  const checkForUpdate = async () => {
    // Nur im Produktionsmodus prüfen
    if (import.meta.env.DEV) return

    try {
      // Fetch version.json mit Cache-Bust (t=timestamp)
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) return

      const data = await response.json()
      
      if (data.version && data.version !== CURRENT_VERSION) {
        showUpdateModal(data.version)
        // Check stoppen, wenn Modal offen
        if (checkInterval) clearInterval(checkInterval)
      }
    } catch (e) {
      console.warn('Version check failed', e)
    }
  }

  const showUpdateModal = (newVersion: string) => {
    dialog.success({
      title: 'Neue Version verfügbar!',
      content: `Eine neue Version (v.${newVersion}) ist online. Bitte aktualisiere die App, um alle Neuerungen und Fixes zu erhalten.`,
      positiveText: 'Jetzt aktualisieren',
      closable: false,
      maskClosable: false,
      onPositiveClick: () => {
        handleHardReload()
      }
    })
  }

  const handleHardReload = async () => {
    // 1. Service Worker Caches löschen (falls vorhanden)
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(key => caches.delete(key)))
    }
    
    // 2. LocalStorage Cache Keys löschen (falls du welche nutzt)
    // localStorage.clear() // Optional: Zu radikal?
    
    // 3. Harter Reload
    window.location.reload()
  }

  onMounted(() => {
    // Sofort beim Start prüfen
    checkForUpdate()
    
    // Dann alle 10 Minuten im Hintergrund
    checkInterval = setInterval(checkForUpdate, 10 * 60 * 1000)
  })

  onUnmounted(() => {
    if (checkInterval) clearInterval(checkInterval)
  })
}
