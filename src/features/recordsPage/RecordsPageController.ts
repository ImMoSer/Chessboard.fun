// src/features/recordsPage/RecordsPageController.ts
import logger from '../../utils/logger';
import type { AppServices } from '../../AppController';
import type {
  LeaderboardApiResponse,
  WorktableLeaderboards,
  OverallSkillLeaderboardEntry,
  SkillStreakLeaderboardEntry
} from '../../core/api.types';
import { subscribeToLangChange, t } from '../../core/i18n.service';

export type SkillPeriod = '7' | '14' | '21' | '30';

export interface RecordsPageControllerState {
  isLoading: boolean;
  error: string | null;
  pageTitle: string;
  worktableLeaderboards: WorktableLeaderboards | null;
  overallSkillData: OverallSkillLeaderboardEntry[] | null;
  skillStreakData: SkillStreakLeaderboardEntry[] | null;
  selectedSkillPeriod: SkillPeriod;
  isSkillLeaderboardLoading: boolean;
}

export class RecordsPageController {
  public state: RecordsPageControllerState;
  public services: AppServices;
  private requestGlobalRedraw: () => void;
  private unsubscribeFromLangChange: (() => void) | null = null;

  constructor(services: AppServices, requestGlobalRedraw: () => void) {
    this.services = services;
    this.requestGlobalRedraw = requestGlobalRedraw;

    this.state = {
      isLoading: true,
      error: null,
      pageTitle: t('records.pageTitle.loading', { defaultValue: 'Loading Leaderboards...' }),
      worktableLeaderboards: null,
      overallSkillData: null,
      skillStreakData: null,
      selectedSkillPeriod: '30', // Default to 30 days
      isSkillLeaderboardLoading: false,
    };

    this.unsubscribeFromLangChange = subscribeToLangChange(() => {
      this.updateLocalizedTexts();
      this.requestGlobalRedraw();
    });

    logger.info('[RecordsPageController] Initialized for combined leaderboards.');
  }

  public async initializePage(): Promise<void> {
    logger.info('[RecordsPageController] Initializing page with combined leaderboards endpoint...');
    this.setState({
        isLoading: true,
        error: null,
        worktableLeaderboards: null,
        overallSkillData: null,
        skillStreakData: null,
    });
    this.updateLocalizedTexts();

    try {
      const combinedData: LeaderboardApiResponse | null = await this.services.webhookService.fetchCombinedLeaderboards();
      
      logger.debug('[RecordsPageController] Received combined data from API:', combinedData);

      if (!combinedData) {
        throw new Error('Failed to fetch leaderboard data.');
      }

      // Собираем worktableLeaderboards из плоской структуры
      const worktableData: WorktableLeaderboards = {
          finishHimLeaderboard: combinedData.finishHimLeaderboard || [],
          towerLeaderboards: combinedData.towerLeaderboards || {},
          attackLeaderboard: combinedData.attackLeaderboard || [],
      };

      this.setState({
        worktableLeaderboards: worktableData,
        overallSkillData: combinedData.overallSkillLeaderboard || null,
        skillStreakData: combinedData.skillStreakLeaderboard || null,
        isLoading: false,
        error: null,
        pageTitle: t('records.pageTitle.loaded', { defaultValue: 'Leaderboards' }),
      });
      logger.info(`[RecordsPageController] Combined leaderboards data loaded and processed.`);

    } catch (error: any) {
      logger.error('[RecordsPageController] Error fetching combined leaderboard data:', error);
      this.setState({
        isLoading: false,
        error: error.message || t('records.errors.unknown', { defaultValue: 'An unknown error occurred.' }),
        pageTitle: t('records.pageTitle.error', { defaultValue: 'Error Loading Leaderboards' }),
      });
    }
  }
  
  public async handleSkillPeriodChange(period: SkillPeriod): Promise<void> {
    if (this.state.selectedSkillPeriod === period) return;

    logger.info(`[RecordsPageController] Period changed to: ${period}. Fetching new skill leaderboard...`);
    this.setState({ 
      selectedSkillPeriod: period,
      isSkillLeaderboardLoading: true,
    });

    try {
      // Используем старый эндпоинт, который теперь будет частью нового API
      const overallSkillData = await this.services.webhookService.fetchOverallSkillLeaderboard(period);
      this.setState({
        overallSkillData,
        isSkillLeaderboardLoading: false,
      });
    } catch (error: any) {
      logger.error(`[RecordsPageController] Error fetching overall skill leaderboard for period ${period}:`, error);
      this.setState({
        isSkillLeaderboardLoading: false,
        error: error.message || t('records.errors.dataLoadFailed', { defaultValue: 'Failed to load leaderboard data.' }),
      });
    }
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

  private setState(newState: Partial<RecordsPageControllerState>): void {
    this.state = { ...this.state, ...newState };
    this.requestGlobalRedraw();
  }

  public destroy(): void {
    if (this.unsubscribeFromLangChange) {
      this.unsubscribeFromLangChange();
      this.unsubscribeFromLangChange = null;
    }
    logger.info('[RecordsPageController] Destroyed.');
  }
}
