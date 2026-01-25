// src/services/WebhookService.ts
import type {
    AdvantageResultDto,
    GamePuzzle,
    GameResultResponse,
    LeaderboardApiResponse,
    OverallSolvedLeaderboardEntry,
    PersonalActivityStatsResponse,
    PersonalOverallSolvedResponse,
    PersonalSolveStreakResponse,
    PracticalChessPuzzle,
    PracticalChessResultDto,
    PracticalStats,
    TheoryEndingCategory,
    TheoryEndingDifficulty,
    TheoryEndingPuzzle,
    TheoryEndingResultDto,
    TheoryEndingType,
    TornadoEndResponse,
    TornadoEndSessionDto,
    TornadoMode,
    TornadoNextPuzzleDto,
    TornadoNextResponse,
    TornadoStartResponse,
    UserProfileStatsDto,
    UserTheoryEndingStatsDto,
} from '../types/api.types'
import logger from '../utils/logger'

export class RateLimitError extends Error {
  public cooldownSeconds: number
  constructor(message: string, cooldownSeconds: number = 60) {
    super(message)
    this.name = 'RateLimitError'
    this.cooldownSeconds = cooldownSeconds
  }
}

export class InsufficientFunCoinsError extends Error {
  public required: number
  public available: number
  constructor(message: string, required: number = 0, available: number = 0) {
    super(message)
    this.name = 'InsufficientFunCoinsError'
    this.required = required
    this.available = available
  }
}

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL as string

if (!BACKEND_API_URL) {
  logger.error(
    '[WebhookService] Critical Configuration Error: VITE_BACKEND_API_URL is not defined.',
  )
}

class WebhookServiceController {
  constructor() {
    logger.info(`[WebhookService] Initialized to work with Backend API at: ${BACKEND_API_URL}`)
  }

  private async _apiRequest<TResponse>(
    path: string,
    method: 'GET' | 'POST',
    context: string,
    body?: object,
  ): Promise<TResponse | null> {
    const url = `${BACKEND_API_URL}${path}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    const options: RequestInit = {
      method,
      headers,
      credentials: 'include',
    }

    if (method === 'POST' && body) {
      options.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, options)
      if (response.status === 429) {
        const r = response.headers.get('Retry-After')
        throw new RateLimitError(`Rate limit exceeded for ${context}.`, r ? parseInt(r, 10) : 60)
      }

      if (response.status === 403) {
        const errorData = await response.json()
        throw new InsufficientFunCoinsError(
          errorData.message || 'Forbidden',
          errorData.required || 0,
          errorData.available || 0,
        )
      }

      if (!response.ok) {
        const e = await response.text()
        logger.error(
          `[WebhookService ${context}] API request failed with status ${response.status}: ${e}`,
        )
        return null
      }

      const c = response.headers.get('content-type')
      if (
        response.status === 204 ||
        (response.status === 200 && (!c || !c.includes('application/json')))
      ) {
        return { status: 'ok' } as unknown as TResponse
      }

      return (await response.json()) as TResponse
    } catch (error) {
      if (error instanceof RateLimitError || error instanceof InsufficientFunCoinsError) throw error
      logger.error(`[WebhookService ${context}] Network or fetch error:`, error)
      return null
    }
  }

  // --- TORNADO API ---
  public async startTornadoSession(
    mode: TornadoMode,
    theme?: string,
  ): Promise<TornadoStartResponse | null> {
    const path = theme ? `/tornado/start/${mode}?theme=${theme}` : `/tornado/start/${mode}`
    return this._apiRequest<TornadoStartResponse>(path, 'GET', 'startTornadoSession')
  }

  public async getNextTornadoPuzzle(
    mode: TornadoMode,
    dto: TornadoNextPuzzleDto,
  ): Promise<TornadoNextResponse | null> {
    return this._apiRequest<TornadoNextResponse>(
      `/tornado/next/${mode}`,
      'POST',
      'getNextTornadoPuzzle',
      dto,
    )
  }

  public async endTornadoSession(
    mode: TornadoMode,
    dto: TornadoEndSessionDto,
  ): Promise<TornadoEndResponse | null> {
    return this._apiRequest<TornadoEndResponse>(
      `/tornado/end-session/${mode}`,
      'POST',
      'endTornadoSession',
      dto,
    )
  }
  // --- END TORNADO API ---

  // --- ADVANTAGE API ---
  public async fetchAdvantagePuzzle(
    theme?: string,
    difficulty?: string,
  ): Promise<GamePuzzle | null> {
    let path = '/advantage/start'
    const params = new URLSearchParams()
    if (theme && theme !== 'auto') params.append('theme', theme)
    if (difficulty) params.append('difficulty', difficulty)

    if (params.toString()) {
      path += `?${params.toString()}`
    }
    return this._apiRequest<GamePuzzle>(path, 'GET', 'fetchAdvantagePuzzle')
  }

  public async processAdvantageResult(dto: AdvantageResultDto): Promise<GameResultResponse | null> {
    return this._apiRequest<GameResultResponse>(
      '/advantage/result',
      'POST',
      'processAdvantageResult',
      dto,
    )
  }

  public async fetchAdvantagePuzzleById(puzzleId: string): Promise<GamePuzzle | null> {
    return this._apiRequest<GamePuzzle>(
      `/advantage/PuzzleId/${puzzleId}`,
      'GET',
      'fetchAdvantagePuzzleById',
    )
  }
  // --- END ADVANTAGE API ---
  // --- THEORY ENDINGS API ---
  public async fetchTheoryPuzzle(
    type: TheoryEndingType,
    difficulty: TheoryEndingDifficulty,
    category: TheoryEndingCategory,
  ): Promise<TheoryEndingPuzzle | null> {
    const path = `/theory-endings/puzzle?type=${type}&difficulty=${difficulty}&category=${category}`
    return this._apiRequest<TheoryEndingPuzzle>(path, 'GET', 'fetchTheoryPuzzle')
  }

  public async processTheoryResult(dto: TheoryEndingResultDto): Promise<GameResultResponse | null> {
    return this._apiRequest<GameResultResponse>(
      '/theory-endings/result',
      'POST',
      'processTheoryResult',
      dto,
    )
  }

  public async fetchTheoryStats(): Promise<UserTheoryEndingStatsDto | null> {
    return this._apiRequest<UserTheoryEndingStatsDto>(
      '/theory-endings/stats',
      'GET',
      'fetchTheoryStats',
    )
  }
  public async fetchTheoryPuzzleById(
    type: TheoryEndingType,
    puzzleId: string,
  ): Promise<TheoryEndingPuzzle | null> {
    const path = `/theory-endings/puzzle/${type}/${puzzleId}`
    return this._apiRequest<TheoryEndingPuzzle>(path, 'GET', 'fetchTheoryPuzzleById')
  }
  // --- END THEORY ENDINGS API ---

  // --- PRACTICAL CHESS API ---
  public async fetchPracticalPuzzle(
    category: string,
    difficulty: string,
  ): Promise<PracticalChessPuzzle | null> {
    const path = `/practical-chess/${category}/puzzle?difficulty=${difficulty}`
    return this._apiRequest<PracticalChessPuzzle>(path, 'GET', 'fetchPracticalPuzzle')
  }

  public async processPracticalResult(
    category: string,
    dto: PracticalChessResultDto,
  ): Promise<GameResultResponse | null> {
    return this._apiRequest<GameResultResponse>(
      `/practical-chess/${category}/process-result`,
      'POST',
      'processPracticalResult',
      dto,
    )
  }

  public async fetchPracticalStats(): Promise<PracticalStats[] | null> {
    return this._apiRequest<PracticalStats[]>('/practical-chess/stats', 'GET', 'fetchPracticalStats')
  }

  public async fetchPracticalPuzzleById(id: string): Promise<PracticalChessPuzzle | null> {
    const path = `/practical-chess/puzzle/${id}`
    return this._apiRequest<PracticalChessPuzzle>(path, 'GET', 'fetchPracticalPuzzleById')
  }
  // --- END PRACTICAL CHESS API ---





  public async fetchCombinedLeaderboards(): Promise<LeaderboardApiResponse | null> {
    return this._apiRequest<LeaderboardApiResponse>(
      `/leaderboards`,
      'GET',
      'fetchCombinedLeaderboards',
    )
  }

  public async fetchOverallSkillLeaderboard(
    period: '7' | '14' | '21' | '30',
  ): Promise<OverallSolvedLeaderboardEntry[] | null> {
    return this._apiRequest<OverallSolvedLeaderboardEntry[]>(
      `/leaderboards/overall-skill?period=${period}`,
      'GET',
      'fetchOverallSkillLeaderboard',
    )
  }

  public async fetchPersonalOverallSkill(): Promise<PersonalOverallSolvedResponse | null> {
    return this._apiRequest<PersonalOverallSolvedResponse>(
      '/activity/personal/overall-skill',
      'GET',
      'fetchPersonalOverallSkill',
    )
  }

  public async fetchPersonalSkillStreak(): Promise<PersonalSolveStreakResponse | null> {
    return this._apiRequest<PersonalSolveStreakResponse>(
      '/activity/personal/skill-streak',
      'GET',
      'fetchPersonalSkillStreak',
    )
  }

  public async fetchPersonalActivityStats(): Promise<PersonalActivityStatsResponse | null> {
    return this._apiRequest<PersonalActivityStatsResponse>(
      '/activity/personal',
      'GET',
      'fetchPersonalActivityStats',
    )
  }

  public async fetchDetailedStats(): Promise<UserProfileStatsDto | null> {
    return this._apiRequest<UserProfileStatsDto>(
      '/users/me/profile-stats',
      'GET',
      'fetchDetailedStats',
    )
  }
}

export const webhookService = new WebhookServiceController()
