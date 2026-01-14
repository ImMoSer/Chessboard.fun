# Practical Chess - Task Completion Report

The "Practical Chess" game mode has been successfully implemented and integrated into both the frontend and backend.

## 🚀 Implemented Features

### Backend (`chess_server`)
1. **Core Service & Logic**:
   - `PracticalChessService`: Handles puzzle retrieval, result processing, and scoring.
   - `PracticalChessCacheService`: Loads and caches puzzles from JSONL files (`jsonl/positions_extra_pawn.jsonl` and `jsonl/positions_mc_zero.jsonl`).
   - `PracticalChessController`: API endpoints for fetching puzzles, processing results, and stats.
2. **Infrastructure**:
   - `PracticalChessModule`: Wired with `AppUserModule`, `AuthModule`, `BillingModule`, and `UserActivityModule`.
   - `PracticalChessStats` Entity: Persistence for user progress per category.
3. **Integration**:
   - **Billing**: Integrated with `BillingService`. Each session costs **5 FunCoins** (Source: `start_game_practical`).
   - **Leaderboards**: Integrated with `HotLeaderboardService`. Weekly records calculated and served via `getCombinedLeaderboards`.
   - **User Stats**: Profile stats now include a `practical` section.
4. **DevOps**:
   - Updated `Dockerfile` to copy the `jsonl/` directory into the production image.

### Frontend (`chess_frontend`)
1. **Views**:
   - `PracticalChessSelectionView.vue`: Category and difficulty selection.
   - `PracticalChessView.vue`: Main gameplay interface.
   - `WelcomeView.vue`: Added a quick-access button.
2. **State Management**:
   - `practicalChess.store.ts`: Manages puzzle loading, game flow, and result submission.
3. **UI/UX Components**:
   - `PracticalStats.vue`: Displayed in `UserCabinetView.vue`.
   - `NavMenu.vue`: Added "Practical" with a pawn icon (♟️).
   - Integrated into `RecordsPageView.vue` (Leaderboard table).
4. **Refinements**:
   - Bot moves first logic enforced in `gameStore.setupPuzzle`.
   - Share functionality updated to support `'practical-chess'` mode.

## 🛠 Fixes & Adjustments
- Resolved `UnknownDependenciesException` for `PracticalChessStatsRepository` and `AuthService` in NestJS modules.
- Fixed `gameStore.setupPuzzle` call signature in the practical store.
- Fixed 404 error by ensuring JSONL files are copied to Docker and CWD is correctly logged.
- Corrected localization keys and missing translations across RU, EN, and DE.

## 📝 Notes for Next Agent
- **Categories**: Currently supporting `extra-pawn` and `BlackOrWhite`.
- **Bot Behavior**: The mode is designed to always have the bot move first.
- **Scoring**: Uses `SCORING_RULES['practical-chess']` from `scoring.constants.ts`.

All type-checks pass on both sides. The system is stable and running in Docker.
