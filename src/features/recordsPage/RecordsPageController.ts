// src/features/recordsPage/RecordsPageController.ts
import logger from '../../utils/logger';
import type { AppServices } from '../../AppController';
import { LeaderboardApiResponse, FinishHimLeaderboardEntry, TowerLeaderboardEntry, AttackLeaderboardEntry, ActivityStatsEntry } from '../../core/webhook.service';
import { subscribeToLangChange, t } from '../../core/i18n.service';
import type { TowerId } from '../tower/tower.types';

export type ActivityPeriod = 'daily' | 'weekly' | 'monthly';
export type ActivityMode = 'all' | 'tower' | 'attack' | 'finishHim' | 'tacticalTrainer';

export interface ProcessedActivityEntry {
  rank: number;
  lichess_id: string;
  username: string;
  subscriptionTier: string;
  solved: number;
  requested: number;
  successRate: number;
}

export type ProcessedLeaderboardEntry = FinishHimLeaderboardEntry | TowerLeaderboardEntry | AttackLeaderboardEntry;

export interface LeaderboardTableConfig {
  id: string;
  titleKey: string;
  defaultTitle: string;
  columns: Array<{
    headerKey: string;
    defaultHeader: string;
    cellValueExtractor: (entry: any) => string | number;
    textAlign?: 'left' | 'center' | 'right';
  }>;
}

type TowerSection = {
    id: TowerId;
    titleKey: string;
    defaultTitle: string;
    entries: TowerLeaderboardEntry[];
};

export interface RecordsPageControllerState {
  isLoading: boolean;
  error: string | null;
  pageTitle: string;
  finishHimTableData: {
    config: LeaderboardTableConfig;
    entries: FinishHimLeaderboardEntry[];
  } | null;
  consolidatedTowerData: {
    config: LeaderboardTableConfig;
    sections: TowerSection[];
  } | null;
  attackTableData: {
    config: LeaderboardTableConfig;
    entries: AttackLeaderboardEntry[];
  } | null;
  selectedActivityPeriod: ActivityPeriod;
  selectedActivityMode: ActivityMode;
  processedActivityData: ProcessedActivityEntry[] | null;
}

const FINISH_HIM_LEADERBOARD_CONFIG: LeaderboardTableConfig = {
  id: 'finishHimLeaderboard',
  titleKey: 'records.titles.topFinishHim',
  defaultTitle: 'Top Finish Him Players',
  columns: [
    { headerKey: 'records.table.rank', defaultHeader: '#', cellValueExtractor: (e: FinishHimLeaderboardEntry) => e.rank, textAlign: 'center' },
    { headerKey: 'records.table.player', defaultHeader: 'Player', cellValueExtractor: (e: FinishHimLeaderboardEntry) => e.username, textAlign: 'left' },
    { headerKey: 'records.table.tacticalShort', defaultHeader: 'Tactical', cellValueExtractor: (e: FinishHimLeaderboardEntry) => e.tacticalRating, textAlign: 'right' },
    { headerKey: 'records.table.playoutShort', defaultHeader: 'Playout', cellValueExtractor: (e: FinishHimLeaderboardEntry) => e.finishHimRating, textAlign: 'right' },
    { headerKey: 'records.table.gamesPlayedShort', defaultHeader: 'Games', cellValueExtractor: (e: FinishHimLeaderboardEntry) => e.gamesPlayed, textAlign: 'right' },
  ],
};

const ATTACK_LEADERBOARD_CONFIG: LeaderboardTableConfig = {
  id: 'attackLeaderboard',
  titleKey: 'records.titles.topAttack',
  defaultTitle: 'Top Attack Players',
  columns: [
    { headerKey: 'records.table.rank', defaultHeader: '#', cellValueExtractor: (e: AttackLeaderboardEntry) => e.rank, textAlign: 'center' },
    { headerKey: 'records.table.player', defaultHeader: 'Player', cellValueExtractor: (e: AttackLeaderboardEntry) => e.username, textAlign: 'left' },
    { headerKey: 'records.table.time', defaultHeader: 'Best Time', cellValueExtractor: (e: AttackLeaderboardEntry) => `${e.best_time}s`, textAlign: 'center' },
    { headerKey: 'records.table.challenge', defaultHeader: 'Challenge', cellValueExtractor: () => '', textAlign: 'center' },
  ],
};

const TOWER_LEADERBOARD_CONFIG: LeaderboardTableConfig = {
    id: 'towerLeaderboard',
    titleKey: 'records.titles.towerLeaderboard',
    defaultTitle: 'Tower Leaderboards',
    columns: [
        { headerKey: 'records.table.rank', defaultHeader: '#', cellValueExtractor: (e: TowerLeaderboardEntry) => e.rank, textAlign: 'center' },
        { headerKey: 'records.table.player', defaultHeader: 'Player', cellValueExtractor: (e: TowerLeaderboardEntry) => e.username, textAlign: 'left' },
        { headerKey: 'records.table.time', defaultHeader: 'Best Time', cellValueExtractor: (e: TowerLeaderboardEntry) => new Date(e.best_time * 1000).toISOString().substr(14, 5), textAlign: 'center' },
        { headerKey: 'records.table.challenge', defaultHeader: 'Challenge', cellValueExtractor: () => '', textAlign: 'center' },
        { headerKey: 'records.table.attempts', defaultHeader: 'Attempts', cellValueExtractor: (e: TowerLeaderboardEntry) => e.versuch, textAlign: 'right' },
    ]
};

const TOWER_IDS_ORDER: TowerId[] = ['CM', 'FM', 'IM', 'GM'];

export class RecordsPageController {
  public state: RecordsPageControllerState;
  public services: AppServices;
  private requestGlobalRedraw: () => void;
  private unsubscribeFromLangChange: (() => void) | null = null;
  private rawApiData: LeaderboardApiResponse | null = null; 

  constructor(services: AppServices, requestGlobalRedraw: () => void) {
    this.services = services;
    this.requestGlobalRedraw = requestGlobalRedraw;

    this.state = {
      isLoading: true,
      error: null,
      pageTitle: t('records.pageTitle.loading', { defaultValue: 'Loading Leaderboards...' }),
      finishHimTableData: null,
      consolidatedTowerData: null,
      attackTableData: null,
      selectedActivityPeriod: 'weekly',
      selectedActivityMode: 'all',
      processedActivityData: null,
    };

    this.unsubscribeFromLangChange = subscribeToLangChange(() => {
      this.updateLocalizedTexts();
      const processedData = this.processAndSetLeaderboards();
      this.setState(processedData);
      this.requestGlobalRedraw();
    });

    logger.info('[RecordsPageController] Initialized.');
  }

  public async initializePage(): Promise<void> {
    logger.info('[RecordsPageController] Initializing page data...');
    this.setState({ 
        isLoading: true, 
        error: null, 
        finishHimTableData: null, 
        consolidatedTowerData: null, 
        attackTableData: null, 
        processedActivityData: null 
    });
    this.updateLocalizedTexts();

    try {
      const leaderboardsData = await this.services.webhookService.fetchLeaderboards();
      logger.info('[RecordsPageController] Raw leaderboards data received:', leaderboardsData); 

      if (leaderboardsData) {
        this.rawApiData = leaderboardsData; 
        const processedData = this.processAndSetLeaderboards();
        this.setState({
          ...processedData,
          isLoading: false,
          error: null,
          pageTitle: t('records.pageTitle.loaded', { defaultValue: 'Leaderboards' }),
        });
        logger.info(`[RecordsPageController] Leaderboard data loaded and processed.`);
      } else {
        throw new Error(t('records.errors.dataLoadFailed', { defaultValue: 'Failed to load leaderboard data.' }));
      }
    } catch (error: any) {
      logger.error('[RecordsPageController] Error fetching leaderboard data:', error);
      this.setState({
        isLoading: false,
        error: error.message || t('records.errors.unknown', { defaultValue: 'An unknown error occurred.' }),
        pageTitle: t('records.pageTitle.error', { defaultValue: 'Error Loading Leaderboards' }),
      });
    }
  }

  public handleActivityPeriodChange(period: ActivityPeriod): void {
    this.setState({ selectedActivityPeriod: period }, () => {
        const processedData = this.processAndSetLeaderboards();
        this.setState(processedData);
    });
  }

  public handleActivityModeChange(mode: ActivityMode): void {
    this.setState({ selectedActivityMode: mode }, () => {
        const processedData = this.processAndSetLeaderboards();
        this.setState(processedData);
    });
  }

  private processActivityStats(): ProcessedActivityEntry[] {
    // <<< ИЗМЕНЕНО: Убрано обращение к final_result
    const activityStats = this.rawApiData?.activityStats;
    if (!activityStats) {
      return [];
    }

    const { selectedActivityPeriod, selectedActivityMode } = this.state;

    const processed = activityStats.map((userStats: ActivityStatsEntry) => {
      const periodStats = userStats.stats[selectedActivityPeriod] || {};
      let solved = 0;
      let requested = 0;

      if (selectedActivityMode === 'all') {
        Object.values(periodStats).forEach(modeStats => {
          solved += modeStats.solved || 0;
          requested += modeStats.requested || 0;
        });
      } else {
        const modeData = periodStats[selectedActivityMode as keyof typeof periodStats];
        if (modeData) {
          solved = modeData.solved || 0;
          requested = modeData.requested || 0;
        }
      }
      
      const successRate = requested > 0 ? (solved / requested) * 100 : 0;

      return {
        lichess_id: userStats.lichess_id,
        username: userStats.username,
        subscriptionTier: userStats.subscriptionTier,
        solved,
        requested,
        successRate,
      };
    })
    .filter(data => data.solved > 0 || data.requested > 0)
    .sort((a, b) => b.solved - a.solved)
    .map((data, index) => ({ ...data, rank: index + 1 }));

    return processed;
  }

  private processAndSetLeaderboards(): Partial<RecordsPageControllerState> {
    // <<< ИЗМЕНЕНО: Убрано обращение к final_result
    const rawData = this.rawApiData;

    if (!rawData) {
      return { finishHimTableData: null, consolidatedTowerData: null, attackTableData: null, processedActivityData: null };
    }
    
    const processedActivityData = this.processActivityStats();

    const finishHimData = (rawData.finishHimLeaderboard && rawData.finishHimLeaderboard.length > 0)
        ? { config: FINISH_HIM_LEADERBOARD_CONFIG, entries: rawData.finishHimLeaderboard }
        : null;

    const attackData = (rawData.attackLeaderboard && rawData.attackLeaderboard.length > 0)
        ? { config: ATTACK_LEADERBOARD_CONFIG, entries: rawData.attackLeaderboard }
        : null;

    const towerSections: TowerSection[] = [];
    if (rawData.towerLeaderboards) {
        for (const towerId of TOWER_IDS_ORDER) {
            const towerData = rawData.towerLeaderboards[towerId];
            if (towerData && towerData.length > 0) {
                towerSections.push({
                    id: towerId,
                    titleKey: `records.titles.tower${towerId}`,
                    defaultTitle: `${towerId} Tower`,
                    entries: towerData
                });
            }
        }
    }
    
    const towerTableData = towerSections.length > 0
        ? { config: TOWER_LEADERBOARD_CONFIG, sections: towerSections }
        : null;

    return {
        finishHimTableData: finishHimData,
        consolidatedTowerData: towerTableData,
        attackTableData: attackData,
        processedActivityData: processedActivityData,
    };
  }

  private updateLocalizedTexts(): void {
    let newPageTitle: string;
    if (this.state.isLoading) {
      newPageTitle = t('records.pageTitle.loading', { defaultValue: 'Loading Leaderboards...' });
    } else if (this.state.error) {
      newPageTitle = t('records.pageTitle.error', { defaultValue: 'Error Loading Leaderboards' });
    } else {
      newPageTitle = t('records.pageTitle.loaded', { defaultValue: 'Leaderboards' });
    }
    if (this.state.pageTitle !== newPageTitle) {
      this.setState({ pageTitle: newPageTitle });
    }
  }

  private setState(newState: Partial<RecordsPageControllerState>, callback?: () => void): void {
    this.state = { ...this.state, ...newState };
    this.requestGlobalRedraw();
    if (callback) {
        callback();
    }
  }

  public destroy(): void {
    if (this.unsubscribeFromLangChange) {
      this.unsubscribeFromLangChange();
      this.unsubscribeFromLangChange = null;
    }
    logger.info('[RecordsPageController] Destroyed.');
  }
}
