// src/core/routing.service.ts
import logger from '../utils/logger';
import type { AppPage } from '../AppController';

const validAppPages: AppPage[] = ['welcome', 'finishHim', 'clubPage', 'recordsPage', 'userCabinet', 'tower', 'lichessClubs', 'about', 'attack', 'tacktics'];

export interface Route {
  page: AppPage;
  clubId: string | null;
  puzzleId: string | null;
  towerId: string | null;
}

export class RoutingService {

  constructor() {
  }

  public parseHash(hash: string): Route {
    const cleanHash = hash.startsWith('/') ? hash.slice(1) : hash;
    logger.info(`[RoutingService] Parsing clean hash: "${cleanHash}"`);

    const finishHimPuzzleMatch = cleanHash.match(/^finishHim\/PuzzleId\/([a-zA-Z0-9]+)$/);
    const attackPuzzleMatch = cleanHash.match(/^attack\/PuzzleId\/([a-zA-Z0-9]+)$/);
    const tackticsPuzzleMatch = cleanHash.match(/^tacktics\/PuzzleId\/([a-zA-Z0-9]+)$/);
    const towerMatch = cleanHash.match(/^tower\/([a-zA-Z0-9]+)$/);

    if (cleanHash === 'cabinet') {
      return { page: 'userCabinet', clubId: null, puzzleId: null, towerId: null };
    }
    if (cleanHash === 'clubs') {
      return { page: 'lichessClubs', clubId: null, puzzleId: null, towerId: null };
    }
    if (cleanHash === 'about') {
      return { page: 'about', clubId: null, puzzleId: null, towerId: null };
    }
    if (finishHimPuzzleMatch) {
      return { page: 'finishHim', puzzleId: finishHimPuzzleMatch[1], clubId: null, towerId: null };
    }
    if (attackPuzzleMatch) {
      return { page: 'attack', puzzleId: attackPuzzleMatch[1], clubId: null, towerId: null };
    }
    if (tackticsPuzzleMatch) {
      return { page: 'tacktics', puzzleId: tackticsPuzzleMatch[1], clubId: null, towerId: null };
    }
    if (towerMatch) {
        return { page: 'tower', towerId: towerMatch[1], clubId: null, puzzleId: null };
    }
    if (cleanHash.startsWith('clubs/')) {
        const parts = cleanHash.split('/');
        if (parts.length === 2 && parts[1]) {
            return { page: 'clubPage', clubId: parts[1], puzzleId: null, towerId: null };
        }
    }
    if (validAppPages.includes(cleanHash as AppPage)) {
        return { page: cleanHash as AppPage, clubId: null, puzzleId: null, towerId: null };
    }

    const defaultPage = 'welcome';
    logger.warn(`[RoutingService] Unrecognized hash: "${cleanHash}". Defaulting to ${defaultPage}.`);
    return { page: defaultPage, clubId: null, puzzleId: null, towerId: null };
  }

  public buildHash(route: Route): string {
    const { page, clubId, puzzleId, towerId } = route;
    if (page === 'clubPage' && clubId) {
        return `#/clubs/${clubId}`;
    }
    if (page === 'finishHim' && puzzleId) {
        return `#/finishHim/PuzzleId/${puzzleId}`;
    }
    if (page === 'attack' && puzzleId) {
        return `#/attack/PuzzleId/${puzzleId}`;
    }
    if (page === 'tacktics' && puzzleId) {
        return `#/tacktics/PuzzleId/${puzzleId}`;
    }
    if (page === 'tower' && towerId) {
        return `#/tower/${towerId}`;
    }
    if (page === 'userCabinet') {
        return '#/cabinet';
    }
    if (validAppPages.includes(page) && page !== 'welcome') {
        const pagePath = (page === 'lichessClubs') ? 'clubs' : page;
        return `#/${pagePath}`;
    }
    return '#';
  }

  public listen(callback: (route: Route) => void): () => void {
    const handler = () => {
      const route = this.parseHash(window.location.hash.slice(1));
      callback(route);
    };
    window.addEventListener('hashchange', handler);
    handler();
    return () => window.removeEventListener('hashchange', handler);
  }

  public updateBrowserHash(route: Route): void {
      const newHashTarget = this.buildHash(route);
      if (window.location.hash !== newHashTarget) {
          window.location.hash = newHashTarget;
      }
  }
}
