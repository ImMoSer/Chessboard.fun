import logger from '../utils/logger'

export interface CloudChapter {
  id: number
  slug: string
  ownerId: string
  title: string
  color: 'white' | 'black'
  pgn: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateChapterRequest {
  title: string
  color: 'white' | 'black'
  pgn: string
  isPublic?: boolean
}

class ChapterApiService {
  private readonly BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000/api'

  async createChapter(request: CreateChapterRequest): Promise<CloudChapter> {
    const response = await fetch(`${this.BACKEND_URL}/study-chapters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to create chapter')
    }

    return response.json()
  }

  async updateChapter(slug: string, request: Partial<CreateChapterRequest>): Promise<CloudChapter> {
    const response = await fetch(`${this.BACKEND_URL}/study-chapters/${slug}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to update chapter')
    }

    return response.json()
  }

  async getChapter(slug: string): Promise<CloudChapter> {
    const response = await fetch(`${this.BACKEND_URL}/study-chapters/${slug}`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Chapter not found')
    }

    return response.json()
  }

  async getMyChapters(): Promise<CloudChapter[]> {
    const response = await fetch(`${this.BACKEND_URL}/study-chapters/my`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      return []
    }

    return response.json()
  }

  async deleteChapter(slug: string): Promise<void> {
    const response = await fetch(`${this.BACKEND_URL}/study-chapters/${slug}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to delete chapter')
    }
  }
}

export const chapterApiService = new ChapterApiService()
