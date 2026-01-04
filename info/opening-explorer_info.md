# Opening Trainer Module - Technical Specification

## Overview

The Opening Trainer module allows users to practice chess openings against an opponent powered by a hybrid of local "Academic" theory, Lichess community statistics, and Masters games. Unlike other modes that use Stockfish, this module focuses on theoretical accuracy and "human-like" responses based on move popularity and official opening books.

## Architecture

### 1. API Integration (`OpeningApiService.ts`)

The service implements a **Unified Data Source** pattern, abstracting differences between the Lichess API and the local Backend Masters API.

-   **Sources**:
    1.  **Masters DB**:
        -   Endpoint: `POST /api/opening/masters` (Backend Proxy).
        -   Data: High-quality games from titled players (2400+).
        -   Structure: Backend response is adapted to match the Lichess format.
    2.  **Lichess Community**:
        -   Endpoint: `https://explorer.lichess.ovh/lichess`.
        -   Parameters: Customizable `ratings` (1000-2500) and `speeds` (bullet, blitz, rapid, classical).
        -   Normalization: Handles UCI anomalies (e.g., castling `e1h1` -> `e1g1`).

-   **Request Deduplication**:
    -   Implements a "Promise Deduplication" pattern.
    -   If a request for a specific key (FEN + Config) is in-flight, subsequent calls return the *existing* promise instead of creating a new network request. This prevents race conditions between the Store and UI Watchers.

### 2. Local Opening Graph (`OpeningGraphService.ts`)

-   **Source**: `public/openings_full_graph/openings_full_graph.json` (~1.2MB).
-   **Structure**: Recursive map of `Clean FEN (EPD)` to `Move Objects`.
-   **Purpose**:
    -   Provides "Academic" names and ECO codes.
    -   Acts as the "Gold Standard" for bot move selection (prioritizes moves known in the graph).

### 3. Caching Layer (`OpeningCacheService.ts`)

-   **Provider**: Dexie.js (IndexedDB wrapper).
-   **Strategy**: **Composite Keys** are used to prevent data collisions when switching databases or filters.
    -   **Masters Key**: `masters:<clean_fen>`
    -   **Lichess Key**: `lichess:<ratings_hash>|<speeds_hash>:<clean_fen>`
        -   *Note*: Ratings and speeds are sorted strictly to ensure key consistency.
-   **TTL**: 7 days.

### 4. State Management (`openingTrainer.store.ts`)

-   **Session Configuration**:
    -   `dbSource`: `'masters'` | `'lichess'`.
    -   `lichessParams`: Object containing selected `ratings` and `speeds`.
-   **Move Selection (Hybrid Logic)**:
    1.  **Fetch Data**: Gets move statistics from the selected source (Masters or Lichess).
    2.  **Academic Intersection**: Filters these moves against the local `OpeningGraph`.
    3.  **Weighted Random**: Selects a move from the intersection (or fallback to raw stats) based on popularity and the `variability` setting.
-   **Optimization**:
    -   Tracks `lastFetchedFen` and `lastFetchedConfig` to skip redundant fetches.

### 5. Integration with Core Game Logic

-   **`game.store.ts`**:
    -   Mode: `'opening-trainer'`.
    -   Utilizes `onUserMoveCallback` to trigger the trainer's response logic.
-   **Smart Navigation (Watcher Optimization)**:
    -   **Goal**: Prevent API spam when the user scrolls through the game history.
    -   **Implementation**: The `watch` in `OpeningTrainerView` calls `fetchStats` with `onlyCache: true`.
    -   **Result**: Navigation updates the stats table *only* if data is already in memory or IndexedDB. It never triggers a network call, preserving quota and bandwidth.
-   **Analysis Integration**:
    -   Decoupled `AnalysisStore` allows toggling Stockfish evaluation *during* the trainer session.
    -   "Smart Navigation" skips bot moves when reviewing history via mouse wheel/buttons.

## UI Components

-   **`OpeningTrainerSettingsModal.vue`**:
    -   **Database Selector**: Toggle between "Masters DB" and "Lichess Players".
    -   **Lichess Filters**: Granular checkboxes for Ratings (1000-2500) and Time Controls (Bullet-Classical).
    -   **Opening Catalog**: Dropdown to start from specific major openings.
-   **`OpeningStatsTable.vue`**:
    -   Displays unified statistics (Moves, Games, Win Rate, Rating).
    -   Supports "Review Mode" (unblurred) and "Practice Mode" (blurred stats).
-   **`WinrateProgressBar.vue`**:
    -   Visualizes the W/D/L ratio for the current position.

## Navigation & Sharing

-   **Route**: `/opening-trainer/:openingSlug?/:color?`
-   **Persistence**: Session settings (DB selection) are preserved in the store during the session.