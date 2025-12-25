# Opening Trainer Module - Technical Specification

## Overview

The Opening Trainer module allows users to practice chess openings against an opponent powered by Lichess community statistics. Unlike other modes that use Stockfish, this module focuses on theoretical accuracy and "human-like" responses based on move popularity.

## Architecture

### 1. API Integration (`OpeningApiService.ts`)

- **Endpoint**: `https://explorer.lichess.ovh/lichess`
- **Parameters**:
  - `variant`: `standard`
  - `speeds`: `bullet,blitz,rapid,classical`
  - `ratings`: `1600,1800,2000,2200,2500`
  - `moves`: `20` (number of candidates to fetch)
  - `fen`: Current board position. (Note: `play` parameter is omitted to avoid "illegal UCI" errors when replaying history).
- **Rate Limiting**: Handles `429 Too Many Requests` by surfacing an error state to the UI.

### 2. Caching Layer (`OpeningCacheService.ts`)

- **Provider**: Dexie.js (IndexedDB wrapper).
- **Key**: FEN string.
- **TTL**: 7 days.
- **Purpose**: Reduces API pressure, respects Lichess limits, and enables snappy transitions between positions.

### 3. State Management (`openingTrainer.store.ts`)

- **Move Selection (Weighted Random)**:
  - Takes the top `variability` moves (user-configurable, range 1-10).
  - Calculates probability based on the number of games played for each move.
  - If total games for selected moves = 0, theory is considered "over".
- **Scoring System**:
  - **Perspective**: The Winrate (WR) is always calculated from the perspective of the **player's chosen color** (`playerColor`).
    - If Player is **White**: `WR = (WhiteWins + 0.5 * Draws) / TotalGames`
    - If Player is **Black**: `WR = (BlackWins + 0.5 * Draws) / TotalGames`
  - **Base Points**:
    - Winrate (WR) >= 55% -> +50 pts
    - WR >= 50% -> +30 pts
    - WR >= 45% -> +10 pts
    - WR < 45% -> -20 pts
  - **Bonus**: +10 pts if the move is among the top 3 most popular moves.
  - **Deviation**: If a user plays a move not in the Lichess stats, `isDeviation` becomes true, and the session halts.
- **Logging**: Detailed browser console logs for score breakdown and session termination reasons.

### 4. Integration with Core Game Logic

- **`game.store.ts`**:
  - Added `'opening-trainer'` mode.
  - Disabled `_triggerBotMove` (Stockfish) for this mode to prevent parallel engine moves.
  - Implemented `onUserMoveCallback` hook to notify the opening store of player actions.
- **Playout Transition**:
  - Users can transition from any theoretical position to a Stockfish game via the "Playout" button.
  - Uses `finishHimStore.startPlayoutFromFen(fen, color)`.

## UI Components

- **`OpeningTrainerSettingsModal.vue`**: Configures `playerColor` and `variability` before session start.
- **`OpeningTrainerHeader.vue`**: Displays opening name, total score, and status badges (Book Ended, Deviation).
- **`WinrateProgressBar.vue`**: Segmented bar showing White/Draw/Black percentages.
- **`OpeningStatsTable.vue`**: Table of available moves, games played, and win rates. Details are blurred until "Review Mode" is toggled.

## Navigation

- Route: `/opening-trainer`
- Entry Points: Main `NavMenu` (📖 icon) and `WelcomeView` feature card.

## Future Development Ideas

- **Multi-Variation Training**: Ability to branch out and save specific variations.
- **Eco Knowledge Base**: Linking to more detailed opening descriptions.
- **Target Accuracy**: Setting a goal for "Perfect Theory" accuracy over a session.
- **Premove Support**: Specific handling for pre-moves in theory.
