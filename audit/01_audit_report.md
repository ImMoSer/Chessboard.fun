# Architectural Audit Report: FSD Compliance

**Date:** 2026-02-22
**Auditor:** Gemini CLI (Senior Architect Persona)
**Methodology:** ATAM + Architectural Fitness Functions

## Executive Summary
The codebase exhibits significant symptoms of a "Distributed Monolith". While the folder structure mimics Feature-Sliced Design (features, entities, shared), the *dependencies* between these layers are tangled. 

**ATAM Score: 3/10**
*   **Modifiability (2/10):** High coupling means changing one feature (e.g., Analysis) breaks unrelated features (Diamond Hunter, Practical Chess).
*   **Isolation (3/10):** Strict layer rules are violated. `Shared` knows about `Features`. `Entities` form circular dependencies.
*   **Cohesion (4/10):** Logic is often placed where it's convenient, not where it belongs (e.g., Board knowing about "Tornado" game mode).

---

## 1. Critical Violations (Fitness Function Failures)

### 1.1. Unidirectional Flow Violations (The "Gravity" Rule)
*   **Severity:** 🚨 CRITICAL
*   **Rule:** `Shared` must NOT import `Features`.
*   **Violation:** `src/shared/lib/composables/useGameLauncher.ts` imports from:
    *   `@/features/finish-him`
    *   `@/features/practical-chess`
    *   `@/features/theory-endings`
    *   *Impact:* The "Shared" layer is no longer shared; it is coupled to specific business logic.

### 1.2. Horizontal Isolation Violations (Cross-Imports)
*   **Severity:** 🚨 CRITICAL
*   **Rule:** Features must not import each other directly.
*   **Violations:**
    *   `src/features/diamond-hunter` imports `@/features/analysis` (Multiple files)
    *   `src/features/finish-him` imports `@/features/analysis`
    *   `src/features/practical-chess` imports `@/features/analysis`
    *   `src/features/mozer-book` imports `@/features/opening-sparring`
    *   `src/features/opening-sparring` imports `@/features/analysis`
    *   *Impact:* You cannot compile or test `Diamond Hunter` without `Analysis`. They are effectively one giant module.

### 1.3. Circular Entity Dependencies
*   **Severity:** 🚨 CRITICAL
*   **Violation:**
    *   `src/entities/board/board.store.ts` imports `@/entities/game`
    *   `src/entities/game/model/game.store.ts` imports `@/entities/board`
    *   *Impact:* Tight coupling prevents separating the "Visual Board" from the "Game Rules".

### 1.4. Public API & Encapsulation
*   **Severity:** ⚠️ HIGH
*   **Violations:**
    *   Missing `index.ts` in: `features/auth`, `features/game-launcher`, `entities/chess`.
    *   Deep Import: `src/features/opening-sparring` imports `@/features/analysis/api/AnalysisService` directly.

---

## 2. God Objects & Design Flaws

### 2.1. The "God Store": `DiamondHunterStore`
*   **File:** `src/features/diamond-hunter/model/diamondHunter.store.ts` (537 lines)
*   **Issues:**
    *   **SRP Violation:** Manages UI state (modals, messages), Game Loop, Data Fetching, and Sound triggers.
    *   **Coupling:** Directly manipulates `BoardStore` (`applyUciMove`, `setupPosition`).
    *   **Testability:** Almost impossible to unit test without mocking the entire app.

### 2.2. Logic Leakage in `BoardStore`
*   **File:** `src/entities/board/board.store.ts`
*   **Issue:** `if (gameStore.currentGameMode !== 'tornado') ...`
*   **Impact:** The dumb `Board` entity knows about high-level game modes. This violates strict layering.

---

## 3. Recommended Action Plan (Refactoring Roadmap)

### Phase 1: Break Circular Dependencies (Emergency Surgery)
1.  Decouple `Board` from `Game`. `Board` should emit events (or use a composable) instead of calling `GameStore` directly.
2.  Remove `Shared` -> `Features` imports. `useGameLauncher` should probably live in `app` or a high-level `widget`.

### Phase 2: Isolate `Analysis` Feature
1.  `Analysis` is currently a dependency for many features. It should probably be moved to `entities/analysis` (if it's just domain logic) or exposed via a strictly typed Interface in `shared/api`.
2.  Refactor `DiamondHunter` to *compose* Analysis components/logic, not import them deeply.

### Phase 3: Decompose God Objects
1.  Split `DiamondHunterStore` into:
    *   `useDiamondHunterGame`: Core game loop (Pure TS).
    *   `useDiamondHunterUI`: UI state (Vue).
    *   `DiamondApiService`: Already exists, but ensure it's pure.

### Phase 4: Enforce Boundaries
1.  Add `eslint-plugin-boundaries` or a custom script to prevent future regressions.
2. Create `index.ts` for all modules.

---

## 4. Automated Verification (ESLint Boundaries)

**Date:** 2026-02-22
**Tool:** `eslint-plugin-boundaries`
**Status:** ❌ FAILED (16 Critical Violations)

The automated lint check confirmed the manual audit findings. The following violations are actively blocking architectural strictness:

### 4.1. Shared Layer Contamination
*   `src/shared/lib/composables/useGameLauncher.ts` -> Imports from `features` (3 errors).

### 4.2. Feature Cross-Contamination
*   `diamond-hunter` -> Imports `features` (Likely Analysis).
*   `finish-him` -> Imports `features`.
*   `mozer-book` -> Imports `features`.
*   `opening-sparring` -> Imports `features`.
*   `practical-chess` -> Imports `features`.
*   `engine` -> Imports `widgets` (Inversion of Control violation).

### 4.3. Entity Cross-Contamination (Circular)
*   `board` -> Imports `entities` (Game).
*   `game` -> Imports `entities` (Board, Engine).
*   `engine` -> Imports `entities` (User).

**Conclusion:** The linter is correctly configured and is actively flagging the "Distributed Monolith" pattern. We must resolve these 16 errors to pass the build.
