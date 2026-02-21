export interface TheoryChapterTemplate {
  name: string
  eco: string
  pgn: string
}

class TheoryChaptersService {
  private chapters: TheoryChapterTemplate[] = []
  private isLoaded = false
  private loadPromise: Promise<void> | null = null

  async load(): Promise<void> {
    if (this.isLoaded) return
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = fetch('/openings_full_graph/opening_chapters.json')
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load')
        this.chapters = (await response.json()) as TheoryChapterTemplate[]
        this.isLoaded = true
      })
      .catch((error: unknown) => {
        console.warn('Failed to load opening chapters:', error)
        this.chapters = []
      })
      .then(() => {
        // Ensure promise resolves to void
        return
      })
      .finally(() => {
        this.loadPromise = null
      })

    return this.loadPromise
  }

  getChapters(): TheoryChapterTemplate[] {
    return this.chapters
  }

  search(query: string): TheoryChapterTemplate[] {
    if (!query) return this.chapters
    const q = query.toLowerCase()
    return this.chapters.filter(
      (c) => c.name.toLowerCase().includes(q) || c.eco.toLowerCase().includes(q),
    )
  }
}

export const theoryChaptersService = new TheoryChaptersService()
