# Opening Trainer Module - Technical Specification

## Overview

The Opening Trainer module allows users to practice chess openings against an opponent powered by a hybrid of local "Academic" theory and Lichess community statistics. Unlike other modes that use Stockfish, this module focuses on theoretical accuracy and "human-like" responses based on move popularity and official opening books.

## Architecture

### 1. API Integration (`OpeningApiService.ts`)

- **Endpoint**: `https://explorer.lichess.ovh/lichess`
- **Parameters**:
  - `variant`: `standard`
  - `speeds`: `bullet,blitz,rapid,classical`
  - `ratings`: `1600,1800,2000,2200,2500`
  - `moves`: `20` (number of candidates to fetch)
  - `fen`: Current board position.
- **Normalization**: Handles Lichess-specific UCI anomalies (e.g., castling `e1h1` -> `e1g1`) to match standard UCI used by the frontend.
- **Rate Limiting**: Handles `429 Too Many Requests` by surfacing an error state to the UI.

### 2. Local Opening Graph (`OpeningGraphService.ts`)

- **Source**: `public/openings_full_graph/openings_full_graph.json` (~1.2MB).
- **Structure**: A recursive map of `Clean FEN (EPD)` to `Move Objects`.
- **Purpose**: 
  - Provides "Academic" names and ECO codes for positions.
  - Defines the "Gold Standard" moves for the bot to prioritize.
  - Generates a "Major Openings" catalog for the UI.
- **Opening Slugs**: Implements a slugification system (`src/utils/slugify.ts`) to enable URL-friendly opening names (e.g., `caro-kann_defense`).

### 3. Caching Layer (`OpeningCacheService.ts`)

- **Provider**: Dexie.js (IndexedDB wrapper).
- **Key**: FEN string.
- **TTL**: 7 days.
- **Purpose**: Reduces API pressure and enables snappy transitions.

### 4. State Management (`openingTrainer.store.ts`)

- **Session Initialization**:
  - Supports starting from any arbitrary sequence of moves (`startMoves`).
  - Automatically navigates the board to the starting position before the session begins.
- **Move Selection (Hybrid Logic)**:
  1. **Academic Priority**: The bot first checks the local `OpeningGraph`. If "Academic Moves" exist for the current position, it restricts its selection to **only** those moves.
  2. **Lichess Fallback**: If no academic moves are found, it falls back to raw Lichess community stats.
  3. **Weighted Random**: Within the chosen subset, the bot selects a move using weighted randomness based on popularity, adjusted by the `variability` setting (1-10).
- **Scoring System**:
  - **Perspective**: Winrate (WR) is calculated from the player's color perspective.
  - **Base Points**: Based on WR thresholds (>=55%:+50, >=50%:+30, >=45%:+10, else -20).
  - **Academic Bonus**: +10 pts if the player makes an "Academic Move" (exists in the graph).
  - **Popularity Bonus**: +10 pts if the move is in the top 3 Lichess candidates.
- **Theory Status**: 
  - `isTheoryOver`: True when no stats are found in Lichess for any candidate.
  - `isDeviation`: True when the player makes a move not present in Lichess stats.

### 5. Integration with Core Game Logic

- **`game.store.ts`**:
  - Mode: `'opening-trainer'`.
  - Disables Stockfish bot; utilizes `onUserMoveCallback` to trigger the trainer's logic.
- **Playout Transition**:
  - Users can jump to a Stockfish game at any time via `/sandbox/play/SF_2200/{color}/{fen}`.
  - Flag `isNavigatingToPlayout` prevents board reset during transition.

## UI Components

- **`OpeningTrainerSettingsModal.vue`**: 
  - **Color Selection**: White or Black.
  - **Opening Catalog**: A searchable dropdown of major openings (e.g., Sicilian, French, Caro-Kann). 
  - **Grouping**: Openings are grouped by their parent name (e.g., "English Opening" instead of 20 different "English Opening: Variation X" items) for better UX.
- **`OpeningTrainerHeader.vue`**: Displays ECO code, Opening name (from Graph or Lichess), total score, and status badges.
- **`WinrateProgressBar.vue`**: Visualizes White/Draw/Black win rates for the current position.
- **`OpeningStatsTable.vue`**: Lists available moves with blurring for "Practice Mode".

## Navigation & Sharing

- **Route Pattern**: `/opening-trainer/:openingSlug?/:color?`
- **Dynamic Parameters**:
  - `openingSlug`: The URL-friendly name of the opening (e.g., `french_defense`).
  - `color`: `for_white` or `for_black`.
- **Auto-Initialization**: If the URL contains parameters, the trainer automatically loads the specified opening and color on mount.
- **Shareability**: Starting a session from the modal automatically updates the browser's URL to reflect the current configuration.

## Development Status

- **Academic Base**: Integrated via local JSON.
- **ECO Codes**: Displayed in header.
- **Start Position Presets**: Fully functional with PGN history support.
- **Future**: 
  - Persistent session history.
  - "Goal" accuracy tracking.
  - Custom user opening repertoires.
