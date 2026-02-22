# Refactoring Plan: From Distributed Monolith to FSD Phase 2

**Based on Audit Report:** `01_audit_report.md`
**Objective:** Eliminate critical architectural violations and establish a strict FSD structure.

## Phase 1: Emergency Surgery (Circular Dependencies & Shared Layer)

**Goal:** Make `Shared` truly shared and break the `Board` <-> `Game` cycle.

### 1.1. Fix `Shared` Layer Violations
*   **Target:** `src/shared/lib/composables/useGameLauncher.ts`
*   **Action:**
    *   Identify why `useGameLauncher` imports features (`finish-him`, `practical-chess`).
    *   Move this logic up to a new Widget or App-level service.
    *   Ensure `src/shared` has ZERO imports from `src/features`.

### 1.2. Decouple `Board` Entity from `Game` Entity
*   **Target:** `src/entities/board/board.store.ts`
*   **Action:**
    *   Remove `import { useGameStore } from '@/entities/game'`.
    *   Refactor logic that depends on `gameStore.currentGameMode`. The Board should not know about game modes.
    *   Use an Event Bus or a Composition Root (in `widgets/game-layout`) to coordinate Board and Game.

## Phase 2: Feature Isolation (The "Analysis" Problem)

**Goal:** Stop features from importing `Analysis` directly.

### 2.1. Extract `Analysis` Core
*   **Target:** `src/features/analysis`
*   **Action:**
    *   Split `Analysis` into:
        *   `entities/analysis`: Core domain logic (Engine lines, evaluation types).
        *   `features/analysis`: UI components (`AnalysisPanel`).
    *   Update other features to import from `entities/analysis` (allowed) instead of `features/analysis` (forbidden).

### 2.2. Fix Cross-Feature Imports
*   **Target:** `DiamondHunter`, `FinishHim`, `PracticalChess`.
*   **Action:**
    *   Refactor them to use the new `entities/analysis`.
    *   If they need full UI components from Analysis, compose them in a `Widget` (e.g., `GameAnalysisWidget`).

## Phase 3: Public API & Encapsulation

**Goal:** Enforce strict entry points.

### 3.1. Add Index Files
*   **Action:** Create `index.ts` for:
    *   `src/features/auth`
    *   `src/features/game-launcher`
    *   `src/entities/chess`
*   **Rule:** The `index.ts` should export *only* what is necessary for other modules.

### 3.2. Eliminate Deep Imports
*   **Target:** `src/features/opening-sparring` -> `@/features/analysis/api/AnalysisService`
*   **Action:** Update imports to use the public API (once Phase 2.1 is done).

## Phase 4: God Object Decomposition

**Goal:** Refactor `DiamondHunterStore`.

### 4.1. Split `DiamondHunterStore`
*   **Target:** `src/features/diamond-hunter/model/diamondHunter.store.ts`
*   **Action:**
    *   Extract `DiamondGameEngine` (Class/Module): Handles rules, moves, validation (Pure TS).
    *   Extract `DiamondAudioService`: Handles sound triggers.
    *   Simplify Store: The store should only hold state and call the Engine.

## Execution Strategy
1.  Pick **ONE** task from Phase 1.
2.  Create a reproduction test case (if applicable).
3.  Refactor.
4.  Verify with `pnpm type-check` and `pnpm lint`.
5.  Commit.
