// src/features/lichessClubs/LichessClubsController.ts
import logger from '../../utils/logger';
import type { AppServices } from '../../AppController';
import type { LichessClubStat, FounderActionDto, ClubIdNamePair } from '../../core/api.types';
import { subscribeToLangChange, t } from '../../core/i18n.service';
import type { VNode } from 'snabbdom';
import { renderLichessClubsPage } from './lichessClubsView';

const FOUNDER_ACTION_COOLDOWN_MS =  24 * 60 * 60 * 1000; // 24 * 60 * 60 * 1000

export interface LichessClubsControllerState {
  isLoading: boolean;
  error: string | null;
  clubsData: LichessClubStat[] | null;
  pageTitle: string;
  isFounder: boolean;
  registeredFounderClub: LichessClubStat | null;
  unregisteredFounderClubs: ClubIdNamePair[];
  isFounderActionLoading: boolean;
  founderActionCooldownHours: number | null;
}

export class LichessClubsController {
  public state: LichessClubsControllerState;
  public services: AppServices;
  private requestPageRedraw: () => void;
  private unsubscribeFromLangChange: (() => void) | null = null;
  private unsubscribeFromAuthChange: (() => void) | null = null;


  constructor(services: AppServices, requestPageRedraw: () => void) {
    this.services = services;
    this.requestPageRedraw = requestPageRedraw;

    this.state = {
      isLoading: true,
      error: null,
      clubsData: null,
      pageTitle: t('lichessClubs.pageTitle.loading', { defaultValue: 'Loading Clubs...' }),
      isFounder: false,
      registeredFounderClub: null,
      unregisteredFounderClubs: [],
      isFounderActionLoading: false,
      founderActionCooldownHours: null,
    };

    this.unsubscribeFromLangChange = subscribeToLangChange(() => {
        this.updateLocalizedTexts();
        this.requestPageRedraw();
    });

    this.unsubscribeFromAuthChange = this.services.authService.subscribe(() => {
        this.processFounderClubs();
    });

    logger.info('[LichessClubsController] Initialized.');
  }

  public renderPage(): VNode {
    return renderLichessClubsPage(this);
  }

  public async initializePage(): Promise<void> {
    logger.info('[LichessClubsController] Initializing page data...');
    this.setState({ isLoading: true, error: null, clubsData: null, isFounderActionLoading: false });
    this.updateLocalizedTexts();

    try {
      const allClubsStats = await this.services.webhookService.fetchAllClubsStats();

      if (allClubsStats) {
        const sortedClubs = allClubsStats.sort((a: LichessClubStat, b: LichessClubStat) => b.total_score - a.total_score);
        
        this.setState({
          clubsData: sortedClubs,
          isLoading: false,
          error: null,
          pageTitle: t('lichessClubs.pageTitle.loaded', { defaultValue: 'All Clubs Statistics' }),
        });

        this.processFounderClubs();

        logger.info(`[LichessClubsController] Clubs data loaded. Clubs found: ${allClubsStats.length}`);
      } else {
        throw new Error(t('lichessClubs.errors.dataLoadFailed', { defaultValue: 'Failed to load clubs data.' }));
      }
    } catch (error: any) {
      logger.error('[LichessClubsController] Error fetching clubs data:', error);
      this.setState({
        isLoading: false,
        error: error.message || t('lichessClubs.errors.unknown', { defaultValue: 'An unknown error occurred.' }),
        clubsData: null,
        pageTitle: t('lichessClubs.pageTitle.error', { defaultValue: 'Error Loading Clubs' })
      });
    }
  }

  private _getCooldownHoursRemaining(): number | null {
    const userId = this.services.authService.getUserProfile()?.id;
    if (!userId) return null;

    const lastActionTimestamp = localStorage.getItem(`founder_action_timestamp_${userId}`);
    if (!lastActionTimestamp) return null;

    const timeSinceLastAction = Date.now() - parseInt(lastActionTimestamp, 10);
    if (timeSinceLastAction < FOUNDER_ACTION_COOLDOWN_MS) {
        return ((FOUNDER_ACTION_COOLDOWN_MS - timeSinceLastAction) / (1000 * 60 * 60));
    }
    return null;
  }
  
  private _setFounderActionTimestamp(): void {
      const userId = this.services.authService.getUserProfile()?.id;
      if (userId) {
          localStorage.setItem(`founder_action_timestamp_${userId}`, String(Date.now()));
      }
  }
  
  private async _handleFounderAction(clubId: string, action: "club_addToList" | "club_delete"): Promise<void> {
    if (this.state.isFounderActionLoading || this._getCooldownHoursRemaining() !== null) return;
    
    if (!this.services.authService.getIsAuthenticated()) {
        this.services.appController.showModal("You must be logged in to perform this action.");
        return;
    }

    this.setState({ isFounderActionLoading: true });
    
    const dto: FounderActionDto = { club_id: clubId, action };
    const response = await this.services.webhookService.manageFounderClub(dto);

    const successMessageKey = action === 'club_addToList' ? 'lichessClubs.founder.addSuccess' : 'lichessClubs.founder.removeSuccess';
    const successDefault = action === 'club_addToList' ? "Club added! Please refresh the page to see the changes." : "Club removed! Please refresh the page to see the changes.";

    if (response?.success) {
        this._setFounderActionTimestamp();
        this.services.appController.showModal(t(successMessageKey, { defaultValue: successDefault }));
        this.initializePage(); 
    } else {
        this.services.appController.showModal(t('lichessClubs.founder.actionFailed', { defaultValue: "Action failed. Please try again later." }));
    }

    this.setState({ isFounderActionLoading: false });
  }

  public async handleAddClub(clubId: string): Promise<void> {
    await this._handleFounderAction(clubId, 'club_addToList');
  }

  public async handleRemoveClub(clubId: string): Promise<void> {
    const club = this.state.registeredFounderClub;
    if (!club) return;

    const message = t('lichessClubs.founder.confirmRemove', { 
        clubName: club.club_name, 
        defaultValue: `Are you sure you want to remove the club "${club.club_name}" from the list? This will allow you to register another one of your clubs.` 
    });
    
    this.services.appController.showConfirmationModal(
        message,
        () => this._handleFounderAction(clubId, 'club_delete')
    );
  }

  private processFounderClubs(): void {
    const cooldownHours = this._getCooldownHoursRemaining();
    
    if (cooldownHours !== null) {
        this.setState({
            founderActionCooldownHours: cooldownHours,
            isFounder: true,
            registeredFounderClub: null,
            unregisteredFounderClubs: []
        });
        return;
    }

    const founderClubs = this.services.authService.getFounderClubs();
    const isFounder = !!(founderClubs && founderClubs.length > 0);
    
    let registeredClub: LichessClubStat | null = null;
    let unregisteredClubs: ClubIdNamePair[] = [];

    if (isFounder && this.state.clubsData && founderClubs) {
        const founderClubIds = founderClubs.map((c: ClubIdNamePair) => c.club_id);
        registeredClub = this.state.clubsData.find((c: LichessClubStat) => founderClubIds.includes(c.club_id)) || null;

        if (registeredClub) {
            unregisteredClubs = founderClubs.filter((fc: ClubIdNamePair) => fc.club_id !== registeredClub!.club_id);
        } else {
            unregisteredClubs = founderClubs;
        }
    }
    
    this.setState({
        isFounder: isFounder,
        registeredFounderClub: registeredClub,
        unregisteredFounderClubs: unregisteredClubs,
        founderActionCooldownHours: null
    });
  }

  private updateLocalizedTexts(): void {
    let newPageTitle = this.state.pageTitle;
    if (this.state.isLoading) {
      newPageTitle = t('lichessClubs.pageTitle.loading', { defaultValue: 'Loading Clubs...' });
    } else if (this.state.error) {
        newPageTitle = t('lichessClubs.pageTitle.error', { defaultValue: 'Error Loading Clubs' });
    } else {
        newPageTitle = t('lichessClubs.pageTitle.loaded', { defaultValue: 'All Clubs Statistics' });
    }
    
    if (this.state.pageTitle !== newPageTitle) {
        this.setState({ pageTitle: newPageTitle });
    }
  }

  private setState(newState: Partial<LichessClubsControllerState>): void {
    const currentState = { ...this.state };
    const updatedState = { ...currentState, ...newState };
  
    if (JSON.stringify(currentState) !== JSON.stringify(updatedState)) {
        this.state = updatedState;
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
    logger.info('[LichessClubsController] Destroyed.');
  }
}
