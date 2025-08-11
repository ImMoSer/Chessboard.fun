// src/core/webhook.service.ts
import logger from '../utils/logger';
import { CacheService } from './cache.service';
import { AuthService } from './auth.service';
import type { 
    WebhookSuccessResponse,
    UpdateFinishHimStatsDto,
    GetNewTowerDto,
    SaveTowerRecordDto,
    AttackRecordDto,
    FollowClubDto,
    FounderActionDto,
    SubmitTacticalResultDto,
    AppPuzzle,
    AppAttackPuzzle,
    AppTacticalPuzzle,
    TacticalTrainerStats,
    TowerData,
    ClubApiResponse,
    LichessClubsApiResponse,
    TelegramBindingUrlResponse,
    LichessClubStat,
    GetTacticalPuzzleDto,
    OverallSkillLeaderboardEntry,
    PersonalOverallSkillResponse,
    PersonalSkillStreakResponse,
    LeaderboardApiResponse,
    PersonalActivityStatsResponse
} from './api.types';

export class RateLimitError extends Error {
  public cooldownSeconds: number;
  constructor(message: string, cooldownSeconds: number = 60) {
    super(message);
    this.name = 'RateLimitError';
    this.cooldownSeconds = cooldownSeconds;
  }
}

export class InsufficientFunCoinsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientFunCoinsError';
  }
}

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL as string;

const CACHE_CLUBS_ALL_TTL_MS = parseInt(import.meta.env.VITE_CACHE_CLUBS_ALL_TTL_MS || '86400000', 10);
const CACHE_CLUB_STATS_TTL_MS = parseInt(import.meta.env.VITE_CACHE_CLUB_STATS_TTL_MS || '86400000', 10);
const CACHE_LEADERBOARDS_TTL_MS = parseInt(import.meta.env.VITE_CACHE_SKILL_LEADERBOARDS_TTL_MS || '300000', 10);
const CACHE_PERSONAL_ACTIVITY_TTL_MS = parseInt(import.meta.env.VITE_CACHE_PERSONAL_ACTIVITY_TTL_MS || '300000', 10);


if (!BACKEND_API_URL) { logger.error('[WebhookService] Critical Configuration Error: VITE_BACKEND_API_URL is not defined.'); }

export class WebhookServiceController {
  constructor() { logger.info(`[WebhookService] Initialized to work with Backend API at: ${BACKEND_API_URL}`); }
  
  private async _apiRequest<TResponse>(path: string, method: 'GET' | 'POST', context: string, body?: object): Promise<WebhookSuccessResponse<TResponse>> {
    const url = `${BACKEND_API_URL}${path}`;
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    const telegramInitData = AuthService.getTelegramInitData();
    if (telegramInitData) {
        headers['X-Telegram-Init-Data'] = telegramInitData;
        logger.debug(`[WebhookService ${context}] Attaching Telegram auth header.`);
    }

    const options: RequestInit = { 
        method, 
        headers, 
        credentials: 'include'
    };

    if (method === 'POST' && body) { options.body = JSON.stringify(body); }
    
    try {
      const response = await fetch(url, options);
      if (response.status === 429) { const r = response.headers.get('Retry-After'); throw new RateLimitError(`Rate limit exceeded for ${context}.`, r ? parseInt(r, 10) : 60); }
      
      if (response.status === 403) {
        const errorData = await response.json();
        throw new InsufficientFunCoinsError(errorData.message || 'Forbidden');
      }

      if (!response.ok) { const e = await response.text(); logger.error(`[WebhookService ${context}] API request failed with status ${response.status}: ${e}`); return null; }
      const c = response.headers.get('content-type');
      if (response.status === 200 && (!c || !c.includes('application/json'))) { return { success: true } as unknown as TResponse; }
      if (response.status === 204) { return { success: true } as unknown as TResponse; }
      return (await response.json()) as TResponse;
    } catch (error) { 
      if (error instanceof RateLimitError || error instanceof InsufficientFunCoinsError) throw error; 
      logger.error(`[WebhookService ${context}] Network or fetch error:`, error); 
      return null; 
    }
  }

  public async fetchPuzzle(): Promise<AppPuzzle | null> { return this._apiRequest<AppPuzzle>('/n8n-proxy/puzzles/finish-him', 'GET', 'fetchPuzzle'); }
  public async fetchPuzzleById(puzzleId: string): Promise<AppPuzzle | null> { return this._apiRequest<AppPuzzle>(`/n8n-proxy/puzzles/finish-him/${puzzleId}`, 'GET', 'fetchPuzzleById'); }
  public async sendFinishHimStatsUpdate(dto: UpdateFinishHimStatsDto): Promise<boolean> { const r = await this._apiRequest<any>('/n8n-proxy/stats/finish-him', 'POST', 'sendFinishHimStatsUpdate', dto); return !!r; }
  public async fetchNewTower(dto: GetNewTowerDto): Promise<TowerData | null> { return this._apiRequest<TowerData>('/n8n-proxy/towers/new', 'POST', 'fetchNewTower', dto); }
  public async fetchTowerById(towerId: string): Promise<TowerData | null> { return this._apiRequest<TowerData>(`/n8n-proxy/towers/${towerId}`, 'GET', 'fetchTowerById'); }
  public async sendTowerRecord(dto: SaveTowerRecordDto): Promise<boolean> { const r = await this._apiRequest<any>('/n8n-proxy/towers/record', 'POST', 'sendTowerRecord', dto); return !!r; }
  public async fetchAttackPuzzle(): Promise<AppAttackPuzzle | null> { return this._apiRequest<AppAttackPuzzle>('/n8n-proxy/puzzles/attack', 'GET', 'fetchAttackPuzzle'); }
  public async fetchAttackPuzzleById(puzzleId: string): Promise<AppAttackPuzzle | null> { return this._apiRequest<AppAttackPuzzle>(`/n8n-proxy/puzzles/attack/${puzzleId}`, 'GET', 'fetchAttackPuzzleById'); }
  public async sendAttackRecord(dto: AttackRecordDto): Promise<boolean> { const r = await this._apiRequest<any>('/n8n-proxy/stats/attack', 'POST', 'sendAttackRecord', dto); return !!r; }
  public async fetchTelegramBindingUrl(): Promise<TelegramBindingUrlResponse | null> { return this._apiRequest<TelegramBindingUrlResponse>('/n8n-proxy/telegram/binding-url', 'GET', 'fetchTelegramBindingUrl'); }
  
  public async fetchTacticalPuzzle(dto: GetTacticalPuzzleDto): Promise<AppTacticalPuzzle | null> { 
    return this._apiRequest<AppTacticalPuzzle>('/tactical-trainer/puzzle', 'POST', 'fetchTacticalPuzzle', dto); 
  }
  public async fetchTacticalPuzzleById(puzzleId: string): Promise<AppTacticalPuzzle | null> { 
    return this._apiRequest<AppTacticalPuzzle>(`/tactical-trainer/puzzle/${puzzleId}`, 'GET', 'fetchTacticalPuzzleById'); 
  }
  public async submitTacticalResult(dto: SubmitTacticalResultDto): Promise<TacticalTrainerStats | null> { 
    return this._apiRequest<TacticalTrainerStats>('/tactical-trainer/submit-result', 'POST', 'submitTacticalResult', dto); 
  }
  public async fetchTacticalStats(): Promise<TacticalTrainerStats | null> { 
    return this._apiRequest<TacticalTrainerStats>('/tactical-trainer/stats', 'GET', 'fetchTacticalStats'); 
  }
  
  public async fetchAllClubsStats(): Promise<WebhookSuccessResponse<LichessClubStat[]>> { 
    const k = 'lichess_clubs_all'; 
    const c = CacheService.get<LichessClubStat[]>(k, CACHE_CLUBS_ALL_TTL_MS); 
    if (c) return c; 
    const d = await this._apiRequest<LichessClubsApiResponse>('/n8n-proxy/clubs', 'GET', 'fetchAllClubsStats'); 
    const s = d?.stats ?? null; 
    if (s) CacheService.set(k, s); 
    return s; 
  }
  
  public async fetchClubStats(clubId: string): Promise<WebhookSuccessResponse<ClubApiResponse>> { 
    const k = `club_stats_v4_${clubId}`; 
    const c = CacheService.get<ClubApiResponse>(k, CACHE_CLUB_STATS_TTL_MS); 
    if (c) return c; 
    const d = await this._apiRequest<ClubApiResponse>(`/n8n-proxy/clubs/${clubId}`, 'GET', 'fetchClubStats'); 
    if (d) CacheService.set(k, d); 
    return d; 
  }
  
  public async updateClubFollowStatus(dto: FollowClubDto): Promise<any | null> { return this._apiRequest<any>('/n8n-proxy/clubs/follow', 'POST', 'updateClubFollowStatus', dto); }
  
  public async manageFounderClub(dto: FounderActionDto): Promise<{success: boolean} | null> { return this._apiRequest<{success: boolean}>('/n8n-proxy/clubs/founder-action', 'POST', 'manageFounderClub', dto); }

  public async fetchCombinedLeaderboards(): Promise<LeaderboardApiResponse | null> {
    const cacheKey = 'leaderboards_combined_v2';
    const cachedData = CacheService.get<LeaderboardApiResponse>(cacheKey, CACHE_LEADERBOARDS_TTL_MS);
    if (cachedData) return cachedData;

    const data = await this._apiRequest<LeaderboardApiResponse>(`/n8n-proxy/leaderboards`, 'GET', 'fetchCombinedLeaderboards');
    if (data) CacheService.set(cacheKey, data);
    return data;
  }

  public async fetchOverallSkillLeaderboard(period: '7' | '14' | '21' | '30'): Promise<OverallSkillLeaderboardEntry[] | null> {
    const cacheKey = `leaderboard_overall_skill_${period}`;
    const cachedData = CacheService.get<OverallSkillLeaderboardEntry[]>(cacheKey, CACHE_LEADERBOARDS_TTL_MS);
    if (cachedData) return cachedData;

    const data = await this._apiRequest<OverallSkillLeaderboardEntry[]>(`/n8n-proxy/leaderboards/overall-skill?period=${period}`, 'GET', 'fetchOverallSkillLeaderboard');
    if (data) CacheService.set(cacheKey, data);
    return data;
  }

  public async fetchPersonalOverallSkill(): Promise<PersonalOverallSkillResponse | null> {
    return this._apiRequest<PersonalOverallSkillResponse>('/activity/personal/overall-skill', 'GET', 'fetchPersonalOverallSkill');
  }

  public async fetchPersonalSkillStreak(): Promise<PersonalSkillStreakResponse | null> {
    return this._apiRequest<PersonalSkillStreakResponse>('/activity/personal/skill-streak', 'GET', 'fetchPersonalSkillStreak');
  }
  
  public async fetchPersonalActivityStats(): Promise<PersonalActivityStatsResponse | null> {
    const cacheKey = 'personal_activity_stats';
    const cachedData = CacheService.get<PersonalActivityStatsResponse>(cacheKey, CACHE_PERSONAL_ACTIVITY_TTL_MS);
    if (cachedData) {
      logger.info('[WebhookService] Returning cached personal activity stats.');
      return cachedData;
    }
    
    const data = await this._apiRequest<PersonalActivityStatsResponse>('/activity/personal', 'GET', 'fetchPersonalActivityStats');
    
    if (data) {
      CacheService.set(cacheKey, data);
    }
    return data;
  }
}

export const WebhookService = new WebhookServiceController();
