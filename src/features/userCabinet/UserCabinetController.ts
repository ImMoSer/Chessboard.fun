// src/features/userCabinet/UserCabinetController.ts
import type { AppServices } from '../../AppController';
import type { UserSessionProfile as UserCabinetData, PersonalActivityStatsResponse } from '../../core/api.types';
import { LichessApiService, type LichessActivityResponse } from '../../core/lichess-api.service';
import { subscribeToLangChange, t } from '../../core/i18n.service';
import logger from '../../utils/logger';
import { PuzzleStorageService, type FavoritePuzzleInfo } from '../../core/puzzle-storage.service';

export interface UserCabinetControllerState {
  isLoading: boolean;
  error: string | null;
  cabinetData: UserCabinetData | null;
  pageTitle: string;
  favoritePuzzles: FavoritePuzzleInfo[];
  lichessActivity: LichessActivityResponse | null;
  isActivityLoading: boolean;
  isBindingUrlLoading: boolean;
  personalActivityStats: PersonalActivityStatsResponse | null;
  isPersonalActivityLoading: boolean;
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
      isBindingUrlLoading: false,
      personalActivityStats: null,
      isPersonalActivityLoading: true,
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
    this.setState({ isLoading: true, isActivityLoading: true, isPersonalActivityLoading: true, error: null }); // <<< ИЗМЕНЕНО
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
      this.fetchPersonalActivityStats(); // <<< ДОБАВЛЕНО

    } else {
      this.setState({
        isLoading: false,
        isActivityLoading: false,
        isPersonalActivityLoading: false, // <<< ДОБАВЛЕНО
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

  // <<< НАЧАЛО ИЗМЕНЕНИЙ: Новый метод для загрузки персональной статистики
  private async fetchPersonalActivityStats(): Promise<void> {
    try {
      const statsData = await this.services.webhookService.fetchPersonalActivityStats();
      this.setState({
        personalActivityStats: statsData,
        isPersonalActivityLoading: false,
      });
      if (statsData) {
        logger.info(`[UserCabinetController] Personal activity stats loaded successfully.`);
      } else {
        logger.warn(`[UserCabinetController] fetchPersonalActivityStats returned null.`);
      }
    } catch (error) {
      logger.error('[UserCabinetController] Failed to fetch personal activity stats:', error);
      this.setState({ isPersonalActivityLoading: false, error: 'Failed to load personal activity stats.' });
    }
  }
  // <<< КОНЕЦ ИЗМЕНЕНИЙ

  public async handleTelegramBinding(): Promise<void> {
    if (this.state.isBindingUrlLoading) return;

    this.setState({ isBindingUrlLoading: true });
    
    try {
      const response = await this.services.webhookService.fetchTelegramBindingUrl();
      if (response && response.bindingUrl) {
        logger.info('[UserCabinetController] Received Telegram binding URL. Opening in a new tab.');
        window.open(response.bindingUrl, '_blank');
        this.services.appController.showModal(t('userCabinet.telegram.redirectMessage', {defaultValue: 'Please complete the binding process in Telegram.'}));
      } else {
        throw new Error('Binding URL was not returned from the server.');
      }
    } catch (error: any) {
      logger.error('[UserCabinetController] Failed to fetch Telegram binding URL:', error);
      this.services.appController.showModal(t('userCabinet.telegram.errorMessage', {defaultValue: 'Could not get the Telegram binding link. Please try again later.'}));
    } finally {
      this.setState({ isBindingUrlLoading: false });
    }
  }
  
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
