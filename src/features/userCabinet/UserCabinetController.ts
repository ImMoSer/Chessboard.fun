// src/features/userCabinet/UserCabinetController.ts
import type { AppServices } from '../../AppController';
import type { UserSessionProfile as UserCabinetData, PersonalActivityStatsResponse } from '../../core/api.types';
import { LichessApiService, type LichessActivityResponse } from '../../core/lichess-api.service';
import { subscribeToLangChange, t } from '../../core/i18n.service';
import logger from '../../utils/logger';
import { PuzzleStorageService, type FavoritePuzzleInfo } from '../../core/puzzle-storage.service';

// <<< НАЧАЛО ИЗМЕНЕНИЙ: Добавлен тип для периода статистики
export type ActivityPeriod = 'daily' | 'weekly' | 'monthly';
// <<< КОНЕЦ ИЗМЕНЕНИЙ

export interface UserCabinetControllerState {
  isLoading: boolean;
  error: string | null;
  cabinetData: UserCabinetData | null;
  pageTitle: string;
  favoritePuzzles: FavoritePuzzleInfo[];
  lichessActivity: LichessActivityResponse | null;
  isActivityLoading: boolean;
  // <<< НАЧАЛО ИЗМЕНЕНИЙ: Обновлены поля для новой персональной статистики
  personalActivityStats: PersonalActivityStatsResponse | null;
  isPersonalActivityStatsLoading: boolean;
  selectedActivityPeriod: ActivityPeriod;
  // <<< КОНЕЦ ИЗМЕНЕНИЙ
}

export class UserCabinetController {
  public state: UserCabinetControllerState;
  public services: AppServices;
  private requestGlobalRedraw: () => void;
  private unsubscribeFromLangChange: (() => void) | null = null;
  private unsubscribeFromAuthChange: (() => void) | null = null;
  private puzzleStorageService: typeof PuzzleStorageService;
  private lichessApiService: typeof LichessApiService;

  constructor(services: AppServices, requestGlobalRedraw: () => void) {
    this.services = services;
    this.requestGlobalRedraw = requestGlobalRedraw;
    this.puzzleStorageService = PuzzleStorageService;
    this.lichessApiService = LichessApiService;

    this.state = {
      isLoading: true,
      error: null,
      cabinetData: null,
      pageTitle: t('userCabinet.pageTitle.loading', { defaultValue: 'Loading User Cabinet...' }),
      favoritePuzzles: [],
      lichessActivity: null,
      isActivityLoading: true,
      // <<< НАЧАЛО ИЗМЕНЕНИЙ: Инициализация новых полей
      personalActivityStats: null,
      isPersonalActivityStatsLoading: true,
      selectedActivityPeriod: 'daily', // Значение по умолчанию
      // <<< КОНЕЦ ИЗМЕНЕНИЙ
    };

    this.unsubscribeFromLangChange = subscribeToLangChange(() => {
      this.updateLocalizedTexts();
    });

    this.unsubscribeFromAuthChange = this.services.authService.subscribe(() => {
        this.initializePage();
    });

    logger.info('[UserCabinetController] Initialized.');
  }

  public async initializePage(): Promise<void> {
    logger.info('[UserCabinetController] Initializing/updating page data.');
    // <<< ИЗМЕНЕНИЕ: Обновлен вызов setState
    this.setState({ isLoading: true, isActivityLoading: true, isPersonalActivityStatsLoading: true, error: null });
    this.updateLocalizedTexts();

    const currentUserProfile = this.services.authService.getUserProfile();

    if (currentUserProfile) {
      const favoritePuzzles = this.puzzleStorageService.getFavoritePuzzles(currentUserProfile.id);
      
      this.setState({
        isLoading: false,
        cabinetData: currentUserProfile,
        favoritePuzzles: favoritePuzzles,
        pageTitle: t('userCabinet.pageTitle.loaded', { username: currentUserProfile.username }),
      });
      logger.info(`[UserCabinetController] Cabinet data populated from AuthService. User: ${currentUserProfile.username}`);

      this.fetchLichessActivity(currentUserProfile.username);
      // <<< ИЗМЕНЕНИЕ: Вызов нового метода
      this.fetchPersonalActivityStats();

    } else {
      this.setState({
        isLoading: false,
        isActivityLoading: false,
        // <<< ИЗМЕНЕНИЕ
        isPersonalActivityStatsLoading: false,
        error: t('userCabinet.error.notAuthenticated', { defaultValue: 'User is not authenticated.' }),
        cabinetData: null,
        favoritePuzzles: [],
        pageTitle: t('userCabinet.pageTitle.error', { defaultValue: 'Error' }),
      });
      logger.warn('[UserCabinetController] No authenticated user found in AuthService.');
    }
  }

  private async fetchLichessActivity(username: string): Promise<void> {
    const activityData = await this.lichessApiService.fetchUserActivity(username);
    this.setState({
        lichessActivity: activityData,
        isActivityLoading: false,
    });
    if (activityData) {
      logger.info(`[UserCabinetController] Lichess activity data loaded for ${username}.`);
    } else {
      logger.warn(`[UserCabinetController] Failed to load Lichess activity for ${username}.`);
    }
  }

  // <<< НАЧАЛО ИЗМЕНЕНИЙ: Новый метод для получения статистики активности
  private async fetchPersonalActivityStats(): Promise<void> {
    try {
      const activityStats = await this.services.webhookService.fetchPersonalActivityStats();
      
      // Логирование полученных данных для дебага
      logger.debug('[UserCabinetController] Fetched personal activity stats:', activityStats);

      this.setState({
        personalActivityStats: activityStats,
        isPersonalActivityStatsLoading: false,
      });
      
      if (activityStats) {
        logger.info(`[UserCabinetController] Personal activity stats loaded successfully.`);
      } else {
        logger.warn(`[UserCabinetController] Personal activity stats request returned null.`);
      }
    } catch (error) {
      logger.error('[UserCabinetController] Failed to fetch personal activity stats:', error);
      this.setState({ isPersonalActivityStatsLoading: false, error: 'Failed to load personal activity stats.' });
    }
  }

  public setSelectedActivityPeriod(period: ActivityPeriod): void {
    if (this.state.selectedActivityPeriod !== period) {
      this.setState({ selectedActivityPeriod: period });
      logger.debug(`[UserCabinetController] Selected activity period changed to: ${period}`);
    }
  }
  // <<< КОНЕЦ ИЗМЕНЕНИЙ
  
  public handleRemoveFavorite(puzzleIdToRemove: string): void {
    const user = this.services.authService.getUserProfile();
    if (!user) return;

    const puzzleToRemove = this.state.favoritePuzzles.find(p => p.id === puzzleIdToRemove);
    if (!puzzleToRemove) {
        logger.warn(`[UserCabinetController] Could not find puzzle with id ${puzzleIdToRemove} to remove from favorites.`);
        return;
    }

    this.puzzleStorageService.toggleFavorite(user.id, puzzleToRemove);

    const updatedFavorites = this.state.favoritePuzzles.filter(p => p.id !== puzzleIdToRemove);
    this.setState({ favoritePuzzles: updatedFavorites });
    logger.info(`[UserCabinetController] Removed puzzle ${puzzleIdToRemove} from favorites.`);
  }

  public updateLocalizedTexts(): void {
    let newPageTitle: string;
    if (this.state.isLoading) {
      newPageTitle = t('userCabinet.pageTitle.loading', { defaultValue: 'Loading User Cabinet...' });
    } else if (this.state.error) {
      newPageTitle = t('userCabinet.pageTitle.error', { defaultValue: 'Error' });
    } else if (this.state.cabinetData) {
      const username = this.state.cabinetData.username || 'User';
      newPageTitle = t('userCabinet.pageTitle.loaded', { username: username, defaultValue: `${username}'s Cabinet` });
    } else {
      newPageTitle = t('userCabinet.pageTitle.default', { defaultValue: 'User Cabinet' });
    }

    if (this.state.pageTitle !== newPageTitle) {
      this.setState({ pageTitle: newPageTitle });
    }
  }

  private setState(newState: Partial<UserCabinetControllerState>): void {
    let hasChanged = false;
    for (const key in newState) {
      if (Object.prototype.hasOwnProperty.call(newState, key)) {
        const typedKey = key as keyof UserCabinetControllerState;
        if(JSON.stringify(this.state[typedKey]) !== JSON.stringify(newState[typedKey])) {
            hasChanged = true;
            break;
        }
      }
    }
    this.state = { ...this.state, ...newState };
    if (hasChanged) {
      this.requestGlobalRedraw();
    }
  }

  public destroy(): void {
    if (this.unsubscribeFromLangChange) {
      this.unsubscribeFromLangChange();
      this.unsubscribeFromLangChange = null;
    }
    if (this.unsubscribeFromAuthChange) {
        this.unsubscribeFromAuthChange();
        this.unsubscribeFromAuthChange = null;
    }
    logger.info('[UserCabinetController] Destroyed.');
  }
}
