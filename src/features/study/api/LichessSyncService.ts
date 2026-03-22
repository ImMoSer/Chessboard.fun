// src/features/study/api/LichessSyncService.ts
import logger from '@/shared/lib/logger'
import { apiClient } from '@/shared/api/client'

export class LichessApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'LichessApiError'
  }
}

export interface LichessStudyCreateRequest {
  name: string
  visibility: 'public' | 'unlisted' | 'private'
  chat: string
  cloneable: string
  computer: string
  explorer: string
  shareable: string
}

export interface LichessImportPgnRequest {
  pgn: string
  name?: string
  orientation?: 'white' | 'black'
  variant?: string
}

class LichessSyncService {
  private readonly BASE_URL = 'https://lichess.org/api'
  private readonly TOKEN_KEY = 'lichess_study_token'

  /**
   * Checks if a valid study token exists in sessionStorage.
   * If not, attempts to fetch it from the backend.
   * Returns true if a token is available, false otherwise (meaning user needs to authorize).
   */
  async ensureToken(): Promise<boolean> {
    const cachedToken = sessionStorage.getItem(this.TOKEN_KEY)
    if (cachedToken) {
      return true
    }

    try {
      const data = await apiClient<{ token: string | null; study_ready: boolean }>('/auth/lichess/study-token')
      if (data && data.token && data.study_ready) {
        sessionStorage.setItem(this.TOKEN_KEY, data.token)
        return true
      }
    } catch (error) {
      logger.error('[LichessSyncService] Failed to fetch study token from backend:', error)
    }

    return false
  }

  private getToken(): string {
    const token = sessionStorage.getItem(this.TOKEN_KEY)
    if (!token) {
      throw new Error('Lichess study token is missing. Please ensureToken() first.')
    }
    return token
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getToken()}`,
      'Accept': 'application/json',
    }
  }

  async createStudy(request: LichessStudyCreateRequest): Promise<string> {
    try {
      const body = new URLSearchParams()
      body.append('name', request.name)
      body.append('visibility', request.visibility)
      body.append('chat', request.chat)
      body.append('cloneable', request.cloneable)
      body.append('computer', request.computer)
      body.append('explorer', request.explorer)
      body.append('shareable', request.shareable)

      const response = await fetch(`${this.BASE_URL}/study`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new LichessApiError(
          response.status,
          error.error || `Failed to create study: ${response.statusText}`,
        )
      }

      if (response.status === 204) return ''
      const data = await response.json()
      return data.id // Returns the new studyId
    } catch (error) {
      logger.error('[LichessSyncService] Error creating study:', error)
      throw error
    }
  }

  async importPgnIntoStudy(studyId: string, request: LichessImportPgnRequest): Promise<string> {
    try {
      const body = new URLSearchParams()
      body.append('pgn', request.pgn)
      if (request.name) body.append('name', request.name)
      if (request.orientation) body.append('orientation', request.orientation)
      if (request.variant) body.append('variant', request.variant)

      const response = await fetch(`${this.BASE_URL}/study/${studyId}/import-pgn`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new LichessApiError(
          response.status,
          error.error || `Failed to import PGN: ${response.statusText}`,
        )
      }

      const data = await response.json()
      if (data.chapters && data.chapters.length > 0) {
        return data.chapters[0].id // Return the new chapter ID
      }
      throw new Error('No chapter was created from the PGN import.')
    } catch (error) {
      logger.error(`[LichessSyncService] Error importing PGN to study ${studyId}:`, error)
      throw error
    }
  }

  async deleteChapter(studyId: string, chapterId: string): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/study/${studyId}/${chapterId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new LichessApiError(
          response.status,
          error.error || `Failed to delete chapter: ${response.statusText}`,
        )
      }
    } catch (error) {
      logger.error(`[LichessSyncService] Error deleting chapter ${chapterId}:`, error)
      throw error
    }
  }

  async fetchStudyPgn(studyId: string): Promise<string> {
    if (!/^[a-zA-Z0-9]{8}$/.test(studyId)) {
      throw new Error(`Invalid Lichess Study ID: ${studyId}. Expected 8 alphanumeric characters.`)
    }
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/x-chess-pgn',
      }
      
      const response = await fetch(`${this.BASE_URL}/study/${studyId}.pgn?orientation=true`, {
        headers,
      })

      if (!response.ok) {
        throw new LichessApiError(
          response.status,
          `Failed to fetch study PGN. Is the study public? (${response.statusText})`,
        )
      }

      return await response.text()
    } catch (error) {
      logger.error(`[LichessSyncService] Error fetching study ${studyId}:`, error)
      throw error
    }
  }
}

export const lichessSyncService = new LichessSyncService()
