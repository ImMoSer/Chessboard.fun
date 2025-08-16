// src/features/clubPage/ClubPageController.ts
import logger from '../../utils/logger';
import type { AppServices } from '../../AppController';
import type { ClubApiResponse, FollowClubDto, ClubIdNamePair, PlayerData } from '../../core/api.types';
import { subscribeToLangChange, t } from '../../core/i18n.service';
import type { VNode } from 'snabbdom';
import { renderClubPage } from './clubPageView';

const FOLLOW_COOLDOWN_MS = 15 * 60 * 1000;

export type ClubPageTableKey = 
  | 'overview'
  | 'mvp' 
  | 'active' 
  | 'totalGames'
  | 'performance' 
  | 'rating' 
  | 'berserkers'
  | 'winStreaks';

export type ClubPageTabId = 'overview' | 'key_indicators' | 'play_style' | 'ratings' | 'medals';


export interface ClubPageControllerState {
  isLoading: boolean;
  error: string | null;
  clubData: ClubApiResponse | null;
  clubId: string;
  pageTitle: string;
  expandedBattleId: string | null;
  expandedMedalInfoKey: string | null;
  isFollowingCurrentClub: boolean;
  isFollowRequestProcessing: boolean;
  activeTab: ClubPageTabId;
  visiblePlayerCounts: Record<ClubPageTableKey, number>;
}

export class ClubPageController {
  public state: ClubPageControllerState;
  private services: AppServices;
  private requestPageRedraw: () => void;
  private clubId: string;
  private unsubscribeFromLangChange: (() => void) | null = null;
  private unsubscribeFromAuthChange: (() => void) | null = null;

  constructor(clubId: string, services: AppServices, requestPageRedraw: () => void) {
    this.clubId = clubId;
    this.services = services;
    this.requestPageRedraw = requestPageRedraw;

    this.state = {
      isLoading: true,
      error: null,
      clubData: null,
      clubId: this.clubId,
      pageTitle: t('clubPage.title.loading', { defaultValue: 'Loading Club...' }),
      expandedBattleId: null,
      expandedMedalInfoKey: null,
      isFollowingCurrentClub: false,
      isFollowRequestProcessing: false,
      activeTab: 'overview',
      visiblePlayerCounts: {
        overview: 10,
        mvp: 10,
        active: 10,
        totalGames: 10,
        performance: 10,
        rating: 10,
        berserkers: 10,
        winStreaks: 10,
      },
    };

    this.unsubscribeFromLangChange = subscribeToLangChange(() => {
        this.updateLocalizedTexts();
        this.requestPageRedraw();
    });

    this.unsubscribeFromAuthChange = this.services.authService.subscribe(() => {
        this.updateFollowStatusFromAuth();
    });

    logger.info(`[ClubPageController] Initialized for clubId: ${this.clubId}`);
  }

  public renderPage(): VNode {
    return renderClubPage(this);
  }

  public getIsUserAuthenticated(): boolean {
    return this.services.authService.getIsAuthenticated();
  }

  public async initializePage(): Promise<void> {
    logger.info(`[ClubPageController] Initializing page for clubId: ${this.clubId}`);
    this.setState({
        isLoading: true,
        error: null,
        clubData: null,
        expandedBattleId: null,
        expandedMedalInfoKey: null,
        isFollowRequestProcessing: false,
        activeTab: 'overview',
        visiblePlayerCounts: {
            overview: 10,
            mvp: 10,
            active: 10,
            totalGames: 10,
            performance: 10,
            rating: 10,
            berserkers: 10,
            winStreaks: 10,
        },
    });
    this.updateLocalizedTexts();
    this.updateFollowStatusFromAuth();

    try {
      const data: ClubApiResponse | null = await this.services.webhookService.fetchClubStats(this.clubId);

      if (data && data.club_info && data.players_data) {
        this.setState({
          clubData: data,
          isLoading: false,
          error: null,
          pageTitle: t('clubPage.title.loaded', { clubName: data.club_info.club_name || this.clubId }),
        });
        logger.info(`[ClubPageController] Club data loaded for ${this.clubId}:`, data);
      } else {
        const errorMessageForState = t('clubPage.error.dataLoadFailedOrNotRegistered', { clubId: this.clubId, defaultValue: `Failed to load data for club ${this.clubId} or club is not registered.` });
        this.setState({
          isLoading: false,
          error: errorMessageForState,
          clubData: null,
          pageTitle: t('clubPage.title.error', { defaultValue: 'Error Loading Club' }),
        });
        logger.warn(`[ClubPageController] fetchClubStats returned null or invalid data for clubId: ${this.clubId}.`);
        
        const modalMessage = t('clubPage.error.clubNotRegisteredModal.message', { clubId: this.clubId, defaultValue: `Клуб "${this.clubId}" не зарегистрирован. Для регистрации клуба обратитесь к администрации` });
        const contactLink = t('clubPage.error.clubNotRegisteredModal.contactLink', { defaultValue: `https://chessboard.fun` });
        this.services.appController.showModal(`${modalMessage} ${contactLink}`);
      }
    } catch (error: any) {
      if (this.services.appController.handleApiRateLimit(error)) {
        return; 
      }
      logger.error(`[ClubPageController] Critical error during fetchClubStats for ${this.clubId}:`, error);
      this.setState({
        isLoading: false,
        error: error.message || t('clubPage.error.unknown', { defaultValue: 'An unknown error occurred.' }),
        clubData: null,
        pageTitle: t('clubPage.title.error', { defaultValue: 'Error Loading Club' }),
      });
    }
  }

  // <<< НАЧАЛО ИЗМЕНЕНИЙ: Метод для сортировки игроков
  public getSortedPlayers(tableKey: ClubPageTableKey): PlayerData[] {
    if (!this.state.clubData || !this.state.clubData.players_data) {
        return [];
    }
    const players = [...this.state.clubData.players_data];

    switch (tableKey) {
        case 'overview':
            return players.sort((a, b) => b.vector - a.vector);
        case 'mvp':
            return players.sort((a, b) => b.total_score - a.total_score);
        case 'active':
            return players.sort((a, b) => b.tournaments_played - a.tournaments_played);
        case 'totalGames':
            return players.sort((a, b) => b.total_games_played - a.total_games_played);
        case 'performance':
            return players.sort((a, b) => b.performance_stats.avg - a.performance_stats.avg);
        case 'rating':
            return players.sort((a, b) => b.rating_stats.avg - a.rating_stats.avg);
        case 'berserkers':
            return players.sort((a, b) => b.total_berserk_wins - a.total_berserk_wins);
        case 'winStreaks':
            return players.sort((a, b) => b.max_longest_win_streak_ever - a.max_longest_win_streak_ever);
        default:
            return players;
    }
  }
  // <<< КОНЕЦ ИЗМЕНЕНИЙ

  private updateFollowStatusFromAuth(): void {
    const isAuthenticated = this.getIsUserAuthenticated();
    let isFollowing = false;
    if (isAuthenticated) {
        const followedClubs: ClubIdNamePair[] | undefined = this.services.authService.getFollowClubs();
        if (followedClubs && Array.isArray(followedClubs)) {
            isFollowing = followedClubs.some((club: ClubIdNamePair) => club.club_id === this.clubId);
        }
    }
    
    if (this.state.isFollowingCurrentClub !== isFollowing) {
        this.setState({ isFollowingCurrentClub: isFollowing });
    }
  }

  private updateLocalizedTexts(): void {
    let newPageTitle = this.state.pageTitle;
    if (this.state.isLoading) {
        newPageTitle = t('clubPage.title.loading', { defaultValue: 'Loading Club...' });
    } else if (this.state.error) {
        newPageTitle = t('clubPage.title.error', { defaultValue: 'Error Loading Club' });
    } else if (this.state.clubData) {
        newPageTitle = t('clubPage.title.loaded', { clubName: this.state.clubData.club_info.club_name || this.clubId });
    }

    if (this.state.pageTitle !== newPageTitle) {
        this.setState({ pageTitle: newPageTitle });
    }
  }

  public toggleTournamentDetails(arenaId: string): void {
    const newExpandedId = this.state.expandedBattleId === arenaId ? null : arenaId;
    this.setState({ expandedBattleId: newExpandedId });
    logger.debug(`[ClubPageController] Toggled tournament details for ${arenaId}. Expanded: ${newExpandedId}`);
  }
  
  public toggleMedalDetails(key: string): void {
    const newExpandedKey = this.state.expandedMedalInfoKey === key ? null : key;
    this.setState({ expandedMedalInfoKey: newExpandedKey });
    logger.debug(`[ClubPageController] Toggled medal details for key ${key}. Expanded: ${newExpandedKey}`);
  }

  public setActiveTab(tabId: ClubPageTabId): void {
    if (this.state.activeTab !== tabId) {
        this.setState({ activeTab: tabId });
        logger.debug(`[ClubPageController] Switched to tab: ${tabId}`);
    }
  }

  public showMore(tableKey: ClubPageTableKey): void {
    const currentCount = this.state.visiblePlayerCounts[tableKey];
    const newCount = currentCount + 10;

    this.setState({
        visiblePlayerCounts: {
            ...this.state.visiblePlayerCounts,
            [tableKey]: newCount,
        }
    });
    logger.debug(`[ClubPageController] Show more for ${tableKey}. New count: ${newCount}`);
  }

  public async toggleFollowCurrentClub(): Promise<void> {
    if (!this.getIsUserAuthenticated()) {
      logger.warn('[ClubPageController toggleFollowCurrentClub] User not authenticated. Action aborted.');
      this.services.appController.showModal(t('auth.requiredForAction',{defaultValue: 'Please log in to perform this action.'}));
      return;
    }
    if (this.state.isFollowRequestProcessing) {
      logger.warn('[ClubPageController toggleFollowCurrentClub] Follow request already in progress.');
      return;
    }

    const currentUser = this.services.authService.getUserProfile();
    if (!currentUser) {
      logger.error('[ClubPageController toggleFollowCurrentClub] Authenticated user profile not found.');
      this.services.appController.showModal(t('clubPage.error.profileNotFound',{defaultValue: 'User profile not found. Please try logging in again.'}));
      return;
    }
    
    const cooldownKey = `follow_cooldown_timestamp_${currentUser.id}`;
    const lastFollowTimestamp = localStorage.getItem(cooldownKey);
    if (lastFollowTimestamp) {
        const elapsedMs = Date.now() - parseInt(lastFollowTimestamp, 10);
        if (elapsedMs < FOLLOW_COOLDOWN_MS) {
            const remainingMinutes = Math.ceil((FOLLOW_COOLDOWN_MS - elapsedMs) / 60000);
            this.services.appController.showModal(
                t('clubPage.error.followCooldown', { minutes: remainingMinutes, defaultValue: `You can change your follow status again in ${remainingMinutes} minutes.` })
            );
            return;
        }
    }

    if (!this.state.clubData || !this.state.clubData.club_info.club_name) {
        logger.error('[ClubPageController toggleFollowCurrentClub] Club data or club name is not available in state.');
        this.services.appController.showModal(t('clubPage.error.clubDataMissing',{defaultValue: 'Club information is missing. Cannot process follow request.'}));
        return;
    }

    this.setState({ isFollowRequestProcessing: true });

    const action: 'follow' | 'unfollow' = this.state.isFollowingCurrentClub ? 'unfollow' : 'follow';
    const dto: FollowClubDto = {
      club_id: this.clubId,
      club_name: this.state.clubData.club_info.club_name,
      action: action,
    };

    logger.info(`[ClubPageController toggleFollowCurrentClub] Sending request to ${action} club ${this.clubId} (${this.state.clubData.club_info.club_name})`);
    let modalMessageKey: string = '';
    let showSuccessModal = false;

    try {
      const response = await this.services.webhookService.updateClubFollowStatus(dto);

      if (response) {
        const currentFollowed = this.services.authService.getFollowClubs() || [];
        let newFollowed: ClubIdNamePair[];
        if (action === 'follow') {
            newFollowed = [...currentFollowed, { club_id: dto.club_id, club_name: dto.club_name }];
            modalMessageKey = 'clubPage.follow.successAdded';
        } else {
            newFollowed = currentFollowed.filter(club => club.club_id !== dto.club_id);
            modalMessageKey = 'clubPage.follow.successRemoved';
        }
        this.services.authService.updateUserProfile({ follow_clubs: newFollowed });
        
        localStorage.setItem(cooldownKey, String(Date.now()));
        showSuccessModal = true;
        logger.info(`[ClubPageController toggleFollowCurrentClub] Club follow status update request successful.`);
      } else {
        logger.error('[ClubPageController toggleFollowCurrentClub] Failed to update club follow status or webhook returned invalid data. Response:', response);
        modalMessageKey = 'clubPage.error.followFailed';
      }
    } catch (error: any) {
      if (this.services.appController.handleApiRateLimit(error)) {
        this.setState({ isFollowRequestProcessing: false });
        return;
      }
      logger.error('[ClubPageController toggleFollowCurrentClub] Error during follow/unfollow request:', error);
      modalMessageKey = 'clubPage.error.followRequestFailed';
    } finally {
      this.setState({ isFollowRequestProcessing: false });
      if (modalMessageKey && (showSuccessModal || modalMessageKey.includes('error'))) {
        this.services.appController.showModal(t(modalMessageKey));
      }
    }
  }

  private setState(newState: Partial<ClubPageControllerState>): void {
    let hasChanged = false;
    for (const key in newState) {
        if (Object.prototype.hasOwnProperty.call(newState, key)) {
            const typedKey = key as keyof ClubPageControllerState;
            if (typeof this.state[typedKey] === 'object' && this.state[typedKey] !== null) {
                if (JSON.stringify(this.state[typedKey]) !== JSON.stringify(newState[typedKey])) {
                    hasChanged = true;
                    break;
                }
            } else if (this.state[typedKey] !== newState[typedKey]) {
                hasChanged = true;
                break;
            }
        }
    }
    
    this.state = { ...this.state, ...newState };

    if (hasChanged) {
        this.requestPageRedraw();
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
    logger.info(`[ClubPageController] Destroyed for clubId: ${this.clubId}`);
  }
}
