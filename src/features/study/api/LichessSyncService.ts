// src/features/study/api/LichessSyncService.ts
import logger from '@/shared/lib/logger'
import { apiClient } from '@/shared/api/client'

export class LichessApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'LichessApiError'
  }
}

export interface LichessImportPgnRequest {
  pgn: string
  name?: string
  orientation?: 'white' | 'black'
  variant?: string
}

class RequestQueue {
  private queue: (() => Promise<void>)[] = []
  private isProcessing = false
  private lastRequestTime = 0
  private readonly minDelayMs = 500 // Generic throttle between requests to be safe

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const now = Date.now()
          const timeSinceLast = now - this.lastRequestTime
          if (timeSinceLast < this.minDelayMs) {
            await new Promise(r => setTimeout(r, this.minDelayMs - timeSinceLast))
          }
          const result = await task()
          this.lastRequestTime = Date.now()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      const task = this.queue.shift()
      if (task) {
        await task()
      }
    }

    this.isProcessing = false
  }
}

class LichessSyncService {
  private readonly BASE_URL = 'https://lichess.org/api'
  private readonly TOKEN_KEY = 'lichess_study_token'
  private readonly queue = new RequestQueue()

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

  async fetchUserStudies(username: string): Promise<{ id: string; name: string; updatedAt: number }[]> {
    return this.queue.enqueue(async () => {
      try {
        const response = await fetch(`${this.BASE_URL}/study/by/${username}`, {
          method: 'GET',
          headers: {
            ...this.getHeaders(),
            'Accept': 'application/x-ndjson',
          },
        })

        if (!response.ok) {
          throw new LichessApiError(response.status, `Failed to fetch studies for ${username}`)
        }

        const text = await response.text()
        const lines = text.split('\n').filter(line => line.trim().length > 0)
        
        const studies: { id: string; name: string; updatedAt: number }[] = []
        for (const line of lines) {
          try {
            const study = JSON.parse(line)
            studies.push({
              id: study.id,
              name: study.name,
              updatedAt: study.updatedAt,
            })
          } catch {
            // Ignore parse errors on corrupted lines
          }
        }
        return studies
      } catch (error) {
        logger.error(`[LichessSyncService] Error fetching user studies for ${username}:`, error)
        throw error
      }
    })
  }

  async checkStudyOwnership(username: string, studyId: string): Promise<boolean> {
    return this.queue.enqueue(async () => {
      try {
        const response = await fetch(`${this.BASE_URL}/study/by/${username}`, {
          method: 'GET',
          headers: {
            ...this.getHeaders(),
            'Accept': 'application/x-ndjson',
          },
        })

        if (!response.ok) {
          throw new LichessApiError(response.status, `Failed to fetch studies for ${username}`)
        }

        const text = await response.text()
        const lines = text.split('\n').filter(line => line.trim().length > 0)
        
        for (const line of lines) {
          try {
            const study = JSON.parse(line)
            if (study.id === studyId) {
              return true
            }
          } catch {
            // Ignore parse errors on corrupted lines
          }
        }
        return false
      } catch (error) {
        logger.error(`[LichessSyncService] Error checking ownership for ${studyId}:`, error)
        throw error
      }
    })
  }

  async importPgnIntoStudy(studyId: string, request: LichessImportPgnRequest): Promise<string> {
    return this.queue.enqueue(async () => {
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
    })
  }

  async deleteChapter(studyId: string, chapterId: string): Promise<void> {
    return this.queue.enqueue(async () => {
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
    })
  }

  async fetchStudyPgn(studyId: string): Promise<string> {
    return this.queue.enqueue(async () => {
      if (!/^[a-zA-Z0-9]{8}$/.test(studyId)) {
        throw new Error(`Invalid Lichess Study ID: ${studyId}. Expected 8 alphanumeric characters.`)
      }
      try {
        // Now using token to fetch PGN since we enforce ownership
        const headers: Record<string, string> = {
          'Accept': 'application/x-chess-pgn',
          'Authorization': `Bearer ${this.getToken()}`,
        }
        
        const response = await fetch(`${this.BASE_URL}/study/${studyId}.pgn?orientation=true`, {
          headers,
        })

        if (!response.ok) {
          throw new LichessApiError(
            response.status,
            `Failed to fetch study PGN. (${response.statusText})`,
          )
        }

        return await response.text()
      } catch (error) {
        logger.error(`[LichessSyncService] Error fetching study ${studyId}:`, error)
        throw error
      }
    })
  }
}

export const lichessSyncService = new LichessSyncService()