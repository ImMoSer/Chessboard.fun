// src/stores/auth.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '../services/AuthService'
import type { UserSessionProfile, UserStatsUpdate } from '../types/api.types'
import logger from '../utils/logger'

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const userProfile = ref<UserSessionProfile | null>(null)
  const isAuthenticated = ref<boolean>(false)
  const isLoading = ref<boolean>(true)
  const error = ref<string | null>(null)

  // --- GETTERS ---
  const getUserProfile = computed(() => userProfile.value)
  const getIsAuthenticated = computed(() => isAuthenticated.value)
  const getIsLoading = computed(() => isLoading.value)
  const getError = computed(() => error.value)

  // --- ACTIONS ---

  function _syncState() {
    const serviceState = authService.getState()
    userProfile.value = serviceState.userProfile
    isAuthenticated.value = serviceState.isAuthenticated
    isLoading.value = serviceState.isProcessing
    error.value = serviceState.error
    logger.debug('[AuthStore] State synchronized with AuthService', serviceState)
  }

  async function initialize() {
    logger.info('[AuthStore] Initializing...')
    authService.subscribe(_syncState)
    await authService.handleAuthentication()
  }

  async function login() {
    await authService.login()
    _syncState()
  }

  async function logout() {
    await authService.logout()
    _syncState()
  }

  async function checkSession() {
    await authService.checkSession()
    _syncState()
  }

  function updateUserStats(statsUpdate: UserStatsUpdate) {
    authService.updateUserStatsFromResponse(statsUpdate)
    _syncState()
  }

  return {
    // State
    userProfile,
    isAuthenticated,
    isLoading,
    error,
    // Getters
    getUserProfile,
    getIsAuthenticated,
    getIsLoading,
    getError,
    // Actions
    initialize,
    login,
    logout,
    checkSession,
    updateUserStats,
  }
})
