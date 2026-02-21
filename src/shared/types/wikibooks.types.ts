// src/types/wikibooks.types.ts

export interface WikiPageExtract {
  pageid: number
  ns: number
  title: string
  extract: string // The raw HTML content
  timestamp: number // For cache invalidation
}

export interface WikiApiResponse {
  batchcomplete: boolean
  query: {
    pages: Record<string, WikiPageExtract | { missing: boolean }>
  }
}

export interface WikiBooksState {
  currentSlug: string | null
  wikiData: WikiPageExtract | null
  isLoading: boolean
  error: string | null
}
