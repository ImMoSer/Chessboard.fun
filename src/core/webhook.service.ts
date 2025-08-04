// src/core/webhook.service.ts
import logger from '../utils/logger';
import { CacheService } from './cache.service';
import type { FinishHimStats } from './auth.service';
import type { TowerId, TowerTheme, TowerPositionEntry, TowerResultEntry } from '../features/tower/tower.types';

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

export type WebhookSuccessResponse<T> = T | null;

export interface PuzzleResultEntry {
  username: string;
  lichess_id: string;
  time_in_seconds: number;
  record_timestamp_ms: number;
}


export interface UpdateFinishHimStatsDto { 
  FunCoins: number; 
  finishHimStats: FinishHimStats;
  solved_in_seconds?: number; 
  PuzzleId?: string;
}
export interface GetNewTowerDto { tower_type: TowerId; tower_theme: TowerTheme; }
export interface SaveTowerRecordDto { 
  username: string; 
  tower_id: string; 
  tower_type: TowerId; 
  time_in_seconds: number; 
  isNewRecord?: boolean;
}
export interface AttackRecordDto { username: string; PuzzleId: string; time_in_seconds: number; }
export interface FollowClubDto { club_id: string; club_name: string; action: 'follow' | 'unfollow'; }
export interface FounderActionDto { club_id: string; action: 'club_addToList' | 'club_delete'; }
export interface SubmitTacticalResultDto {
  PuzzleId: string;
  Rating: number;
  Themes_PG: string[];
  success: boolean;
}

export interface AppPuzzle { 
  PuzzleId: string; 
  FEN_0: string; 
  Moves: string; 
  bot_color: 'w' | 'b'; 
  solve_time?: number; 
  fun_value?: number; 
  Tactical_Rating?: number; 
  PlayOut_Rating?: number; 
  endgame_results?: PuzzleResultEntry[];
  fen_final?: string;
}

export interface AppAttackPuzzle { 
  PuzzleId: string; 
  FEN_0: string; 
  Moves: string; 
  Rating: number; 
  attack_results?: PuzzleResultEntry[];
}

export interface AppTacticalPuzzle {
  PuzzleId: string;
  FEN_0: string;
  Moves: string;
  Rating: number;
  Themes_PG: string[];
}

export interface TacticalThemeStat {
  rating: number;
  total_attempts: number;
  solved: number;
  failed: number;
  last_activity: string | null;
}

export interface TacticalTrainerStats {
  global_rating: number;
  theme_stats: Record<string, TacticalThemeStat>;
}

export interface TowerData {
  tower_id: string;
  tower_type: TowerId;
  tower_theme: TowerTheme;
  bw_value_total: number;
  average_rating: number;
  positions: TowerPositionEntry[];
  tower_results: TowerResultEntry[] | null;
}
export interface TournamentInfo { name: string; url: string; date: string; }
export interface MedalDetail { count: number; tournaments: TournamentInfo[]; }
interface Medals { gold: MedalDetail; silver: MedalDetail; bronze: MedalDetail; }
export interface PlayerData { lichess_id: string; username: string; flair: string | null; vector: number; tournaments_played: number; total_score: number; total_games_played: number; win_rate: number; total_berserk_wins: number; max_longest_win_streak_ever: number; rating_stats: { avg: number; min: number; max: number; }; performance_stats: { avg: number; min: number; max: number; }; medals_in_team: Medals; medals_in_arena: Medals; team_medal_sum: number; arena_medal_sum: number; }
export interface PlayersDataMap { [key: string]: PlayerData; }
export interface TournamentPlayer { username: string; lichess_id: string; user_score: number; user_rating: number; user_performance: number; user_inTeamRank: number; user_inArenaRank: number; user_flair?: string; calculatedStats: { wins: number; draws: number; losses: number; berserkWins: number; gamesPlayed: number; pointsTotal: number; longestWinStreak: number; }; }
export interface TournamentHistoryEntry { arena_id: string; arena_url: string; tournament_name: string; starts_at_date: string; team_rank: number; team_score: number; team_full_stats: any; players: TournamentPlayer[]; }
export interface ClubLeader { id: string; name: string; flair?: string; title?: string; }
export interface ClubApiResponse { club_id: string; club_name: string; grunder: string; nb_members: number; jsonb_array_leader: ClubLeader[]; tournament_history: TournamentHistoryEntry[]; players_data: PlayersDataMap; leaderboards: any; }
export interface LichessClubStat { club_id: string; best_rank: number; club_name: string; total_score: number; average_rank: number; average_score: number; tournaments_played: number; }
export interface LichessClubsApiResponse { stats: LichessClubStat[]; }
export interface FinishHimLeaderboardEntry {
  rank: number;
  username: string;
  lichess_id: string;
  gamesPlayed: number;
  tacticalRating: number;
  finishHimRating: number;
  subscriptionTier?: string;
}
export interface TowerLeaderboardEntry {
  rank: number;
  tower_id: string;
  username: string;
  best_time: number;
  days_old: number;
  lichess_id: string;
  subscriptionTier?: string;
}
export interface AttackLeaderboardEntry {
  rank: number;
  username: string;
  best_time: number;
  days_old: number;
  puzzle_id: string;
  lichess_id: string;
  subscriptionTier?: string;
}

export interface ActivityModeStats {
  solved: number;
  requested: number;
}

export interface ActivityPeriodStats {
  finishHim?: ActivityModeStats;
  tower?: ActivityModeStats;
  attack?: ActivityModeStats;
  tacticalTrainer?: ActivityModeStats;
}

export interface ActivityStatsEntry {
  lichess_id: string;
  username: string;
  subscriptionTier: string;
  stats: {
    daily: ActivityPeriodStats;
    weekly: ActivityPeriodStats;
    monthly: ActivityPeriodStats;
  };
}

export interface LeaderboardApiResponse { 
  towerLeaderboards: { [key in TowerId]?: TowerLeaderboardEntry[] }; 
  finishHimLeaderboard: FinishHimLeaderboardEntry[]; 
  attackLeaderboard?: AttackLeaderboardEntry[];
  activityStats?: ActivityStatsEntry[];
}

export interface TelegramBindingUrlResponse {
  bindingUrl: string;
}

export interface PersonalActivityModeStats {
  daily: ActivityModeStats;
  weekly: ActivityModeStats;
  monthly: ActivityModeStats;
}

export interface PersonalActivityStatsResponse {
  finishHim?: PersonalActivityModeStats;
  tower?: PersonalActivityModeStats;
  attack?: PersonalActivityModeStats;
  tacticalTrainer?: PersonalActivityModeStats;
}


const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL as string;

const CACHE_CLUBS_ALL_TTL_MS = parseInt(import.meta.env.VITE_CACHE_CLUBS_ALL_TTL_MS || '86400000', 10);
const CACHE_CLUB_STATS_TTL_MS = parseInt(import.meta.env.VITE_CACHE_CLUB_STATS_TTL_MS || '86400000', 10);
const CACHE_LEADERBOARDS_TTL_MS = parseInt(import.meta.env.VITE_CACHE_LEADERBOARDS_TTL_MS || '300000', 10);


if (!BACKEND_API_URL) { logger.error('[WebhookService] Critical Configuration Error: VITE_BACKEND_API_URL is not defined.'); }

export class WebhookServiceController {
  constructor() { logger.info(`[WebhookService] Initialized to work with Backend API at: ${BACKEND_API_URL}`); }
  private async _apiRequest<TResponse>(path: string, method: 'GET' | 'POST', context: string, body?: object): Promise<WebhookSuccessResponse<TResponse>> {
    const url = `${BACKEND_API_URL}${path}`;
    const options: RequestInit = { method, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, credentials: 'include' };
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
  
  public async fetchTacticalPuzzle(): Promise<AppTacticalPuzzle | null> { return this._apiRequest<AppTacticalPuzzle>('/n8n-proxy/puzzles/tactical-trainer', 'GET', 'fetchTacticalPuzzle'); }
  public async fetchTacticalPuzzleById(puzzleId: string): Promise<AppTacticalPuzzle | null> { return this._apiRequest<AppTacticalPuzzle>(`/n8n-proxy/puzzles/tactical-trainer/${puzzleId}`, 'GET', 'fetchTacticalPuzzleById'); }
  public async submitTacticalResult(dto: SubmitTacticalResultDto): Promise<TacticalTrainerStats | null> { return this._apiRequest<TacticalTrainerStats>('/n8n-proxy/puzzles/tactical-trainer/submit-result', 'POST', 'submitTacticalResult', dto); }
  public async fetchTacticalStats(): Promise<TacticalTrainerStats | null> { return this._apiRequest<TacticalTrainerStats>('/n8n-proxy/tactical-trainer/stats', 'GET', 'fetchTacticalStats'); }

  public async fetchPersonalActivityStats(): Promise<PersonalActivityStatsResponse | null> {
    return this._apiRequest<PersonalActivityStatsResponse>('/activity/personal', 'GET', 'fetchPersonalActivityStats');
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
  
  public async fetchLeaderboards(): Promise<WebhookSuccessResponse<LeaderboardApiResponse>> { 
    const k = 'leaderboards_all_v2'; 
    const c = CacheService.get<LeaderboardApiResponse>(k, CACHE_LEADERBOARDS_TTL_MS); 
    if (c) return c; 
    const d = await this._apiRequest<LeaderboardApiResponse>('/n8n-proxy/leaderboards', 'GET', 'fetchLeaderboards'); 
    if (d) CacheService.set(k, d); 
    return d; 
  }
  
  public async manageFounderClub(dto: FounderActionDto): Promise<{success: boolean} | null> { return this._apiRequest<{success: boolean}>('/n8n-proxy/clubs/founder-action', 'POST', 'manageFounderClub', dto); }
}

export const WebhookService = new WebhookServiceController();
