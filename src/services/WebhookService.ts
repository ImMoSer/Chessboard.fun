// src/services/WebhookService.ts
import logger from '../utils/logger'
import { authService } from './AuthService'
import type {
  WebhookSuccessResponse,
  UpdateFinishHimStatsDto,
  GetNewTowerDto,
  SaveTowerRecordDto,
  AttackRecordDto,
  SubmitTacticalResultDto,
  GamePuzzle,
  TacticalTrainerStats,
  TowerData,
  TelegramBindingUrlResponse,
  GetTacticalPuzzleDto,
  OverallSkillLeaderboardEntry,
  PersonalOverallSkillResponse,
  PersonalSkillStreakResponse,
  LeaderboardApiResponse,
  PersonalActivityStatsResponse,
  GameResultResponse,
  GetFinishHimPuzzleDto,
  TornadoMode,
  TornadoNextPuzzleDto,
  TornadoEndSessionDto,
  TornadoStartResponse,
  TornadoNextResponse,
  TornadoEndResponse,
  FunclubMeta,
  TeamBattleReport,
  // --- НАЧАЛО ИЗМЕНЕНИЙ ---
  LatestTeamBattleReport,
  AdvantageMode,
  AdvantageResultDto,
  DetailedStatsResponse,
  // --- КОНЕЦ ИЗМЕНЕНИЙ ---
} from '../types/api.types'

export class RateLimitError extends Error {
  public cooldownSeconds: number
  constructor(message: string, cooldownSeconds: number = 60) {
    super(message)
    this.name = 'RateLimitError'
    this.cooldownSeconds = cooldownSeconds
  }
}

export class InsufficientFunCoinsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InsufficientFunCoinsError'
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

    const telegramInitData = authService.getTelegramInitData()
    if (telegramInitData) {
      headers['X-Telegram-Init-Data'] = telegramInitData
      logger.debug(`[WebhookService ${context}] Attaching Telegram auth header.`)
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
        throw new InsufficientFunCoinsError(errorData.message || 'Forbidden')
      }

      if (!response.ok) {
        const e = await response.text()
        logger.error(
          `[WebhookService ${context}] API request failed with status ${response.status}: ${e}`,
        )
        return null
      }

      const c = response.headers.get('content-type')
      if (response.status === 204 || (response.status === 200 && (!c || !c.includes('application/json')))) {
        return { status: 'ok' } as unknown as TResponse
      }

      return (await response.json()) as TResponse
    } catch (error) {
      if (error instanceof RateLimitError || error instanceof InsufficientFunCoinsError) throw error
      logger.error(`[WebhookService ${context}] Network or fetch error:`, error)
      return null
    }
  }

  // --- ADVANTAGE API ---
  public async getAdvantageNextPuzzle(mode: AdvantageMode): Promise<GamePuzzle | null> {
    return this._apiRequest<GamePuzzle>(
      `/advantage/next/${mode}`,
      'GET',
      'getAdvantageNextPuzzle',
    )
  }

  public async postAdvantageResult(
    mode: AdvantageMode,
    dto: AdvantageResultDto,
  ): Promise<GameResultResponse | null> {
    return this._apiRequest<GameResultResponse>(
      `/advantage/result/${mode}`,
      'POST',
      'postAdvantageResult',
      dto,
    )
  }

  public async getAdvantagePuzzleById(puzzleId: string): Promise<GamePuzzle | null> {
    return this._apiRequest<GamePuzzle>(
      `/advantage/PuzzleId/${puzzleId}`,
      'GET',
      'getAdvantagePuzzleById',
    )
  }
  // --- END ADVANTAGE API ---

  // --- NEW FUNCLUB STATS API ---
  public async fetchFunclubClubMeta(): Promise<FunclubMeta | null> {
    return this._apiRequest<FunclubMeta>('/funclub-stats/club-meta', 'GET', 'fetchFunclubClubMeta')
  }

  public async fetchFunclubTeamBattleReport(
    period: 'last_30_days' | string,
  ): Promise<TeamBattleReport | null> {
    const path =
      period === 'last_30_days'
        ? '/funclub-stats/team-battle/last_30_days'
        : `/funclub-stats/team-battle/monthly/${period.replace('-', '/')}`
    return this._apiRequest<TeamBattleReport>(path, 'GET', 'fetchFunclubTeamBattleReport')
  }

  // --- НАЧАЛО ИЗМЕНЕНИЙ ---
  public async fetchLatestTeamBattleReport(): Promise<LatestTeamBattleReport | null> {
    return this._apiRequest<LatestTeamBattleReport>(
      '/funclub-stats/team-battle/latest',
      'GET',
      'fetchLatestTeamBattleReport',
    )
  }
  // --- КОНЕЦ ИЗМЕНЕНИЙ ---

  // --- TORNADO API ---
  public async startTornadoSession(mode: TornadoMode): Promise<TornadoStartResponse | null> {
    return this._apiRequest<TornadoStartResponse>(
      `/tornado/start/${mode}`,
      'GET',
      'startTornadoSession',
    )
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

  public async fetchPuzzle(dto?: GetFinishHimPuzzleDto): Promise<GamePuzzle | null> {
    return this._apiRequest<GamePuzzle>('/n8n-proxy/puzzles/finish-him', 'POST', 'fetchPuzzle', dto)
  }
  public async fetchPuzzleById(puzzleId: string): Promise<GamePuzzle | null> {
    return this._apiRequest<GamePuzzle>(
      `/n8n-proxy/puzzles/finish-him/${puzzleId}`,
      'GET',
      'fetchPuzzleById',
    )
  }

  public async sendFinishHimStatsUpdate(
    dto: UpdateFinishHimStatsDto,
  ): Promise<GameResultResponse | null> {
    return this._apiRequest<GameResultResponse>(
      '/n8n-proxy/stats/finish-him',
      'POST',
      'sendFinishHimStatsUpdate',
      dto,
    )
  }

  public sendFinishHimStatsUpdateBeacon(dto: UpdateFinishHimStatsDto): boolean {
    const url = `${BACKEND_API_URL}/n8n-proxy/stats/finish-him`
    const telegramInitData = authService.getTelegramInitData()

    // The backend must be adapted to read auth data from the body for beacon requests
    const payload = {
      ...dto,
      ...(telegramInitData && { telegramInitData }),
    }

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })

    try {
      const status = navigator.sendBeacon(url, blob)
      logger.info(`[WebhookService] sendFinishHimStatsUpdateBeacon status: ${status}`)
      return status
    } catch (error) {
      logger.error('[WebhookService] sendFinishHimStatsUpdateBeacon failed:', error)
      return false
    }
  }

  public async fetchNewTower(dto: GetNewTowerDto): Promise<TowerData | null> {
    return this._apiRequest<TowerData>('/n8n-proxy/towers/new', 'POST', 'fetchNewTower', dto)
  }
  public async fetchTowerById(towerId: string): Promise<TowerData | null> {
    return this._apiRequest<TowerData>(`/n8n-proxy/towers/${towerId}`, 'GET', 'fetchTowerById')
  }
  public async sendTowerRecord(dto: SaveTowerRecordDto): Promise<GameResultResponse | null> {
    return this._apiRequest<GameResultResponse>(
      '/n8n-proxy/towers/record',
      'POST',
      'sendTowerRecord',
      dto,
    )
  }
  public async fetchAttackPuzzle(): Promise<GamePuzzle | null> {
    return this._apiRequest<GamePuzzle>('/n8n-proxy/puzzles/attack', 'GET', 'fetchAttackPuzzle')
  }
  public async fetchAttackPuzzleById(puzzleId: string): Promise<GamePuzzle | null> {
    return this._apiRequest<GamePuzzle>(
      `/n8n-proxy/puzzles/attack/${puzzleId}`,
      'GET',
      'fetchAttackPuzzleById',
    )
  }
  public async sendAttackRecord(dto: AttackRecordDto): Promise<GameResultResponse | null> {
    return this._apiRequest<GameResultResponse>(
      '/n8n-proxy/stats/attack',
      'POST',
      'sendAttackRecord',
      dto,
    )
  }
  public async fetchTelegramBindingUrl(): Promise<TelegramBindingUrlResponse | null> {
    return this._apiRequest<TelegramBindingUrlResponse>(
      '/n8n-proxy/telegram/binding-url',
      'GET',
      'fetchTelegramBindingUrl',
    )
  }

  public async fetchTacticalPuzzle(dto: GetTacticalPuzzleDto): Promise<GamePuzzle | null> {
    return this._apiRequest<GamePuzzle>(
      '/tactical-trainer/puzzle',
      'POST',
      'fetchTacticalPuzzle',
      dto,
    )
  }
  public async fetchTacticalPuzzleById(puzzleId: string): Promise<GamePuzzle | null> {
    return this._apiRequest<GamePuzzle>(
      `/tactical-trainer/puzzle/${puzzleId}`,
      'GET',
      'fetchTacticalPuzzleById',
    )
  }
  public async submitTacticalResult(
    dto: SubmitTacticalResultDto,
  ): Promise<TacticalTrainerStats | null> {
    return this._apiRequest<TacticalTrainerStats>(
      '/tactical-trainer/submit-result',
      'POST',
      'submitTacticalResult',
      dto,
    )
  }
  public async fetchTacticalStats(): Promise<TacticalTrainerStats | null> {
    return this._apiRequest<TacticalTrainerStats>(
      '/tactical-trainer/stats',
      'GET',
      'fetchTacticalStats',
    )
  }

  public async fetchCombinedLeaderboards(): Promise<LeaderboardApiResponse | null> {
    return this._apiRequest<LeaderboardApiResponse>(
      `/n8n-proxy/leaderboards`,
      'GET',
      'fetchCombinedLeaderboards',
    )
  }

  public async fetchOverallSkillLeaderboard(
    period: '7' | '14' | '21' | '30',
  ): Promise<OverallSkillLeaderboardEntry[] | null> {
    return this._apiRequest<OverallSkillLeaderboardEntry[]>(
      `/n8n-proxy/leaderboards/overall-skill?period=${period}`,
      'GET',
      'fetchOverallSkillLeaderboard',
    )
  }

  public async fetchPersonalOverallSkill(): Promise<PersonalOverallSkillResponse | null> {
    return this._apiRequest<PersonalOverallSkillResponse>(
      '/activity/personal/overall-skill',
      'GET',
      'fetchPersonalOverallSkill',
    )
  }

  public async fetchPersonalSkillStreak(): Promise<PersonalSkillStreakResponse | null> {
    return this._apiRequest<PersonalSkillStreakResponse>(
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

  public async fetchDetailedStats(): Promise<DetailedStatsResponse | null> {
    return this._apiRequest<DetailedStatsResponse>(
      '/users/me/detailed-stats',
      'GET',
      'fetchDetailedStats',
    )
  }
}

export const webhookService = new WebhookServiceController()
