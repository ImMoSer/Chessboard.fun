# Refactoring Progress Log

## Phase 1: Emergency Surgery (Completed)
- [x] **1.1. Fix Shared Layer Violations (`useGameLauncher.ts`)**
- [x] **1.2. Decouple Board Entity from Game Entity**

## Phase 2: Feature Isolation (Completed)
- [x] **2.1. Extract `Analysis` Core**
    - Created `entities/analysis`.
    - Moved core logic out of `features/analysis`.
- [x] **2.2. Fix Cross-Feature Imports**
    - Decoupled `DiamondHunter`, `FinishHim`, `PracticalChess`, `MozerBook`.
    - Fixed `EngineSelector` (Feature -> Widget violation).

## Phase 3: Final Cleanup (Completed)
- [x] **3.1. Infrastructure Migration**
    - Moved `entities/engine` to `shared/lib/engine`.
    - **Result:** `Analysis` and `Game` entities can now import engine services legally.
- [x] **3.2. Authentication Decoupling**
    - `ServerEngineService` no longer depends on `AuthStore`.
- [x] **3.3. UI Composition**
    - `OpeningSparringSummaryModal` uses Slots for `EngineSelector` instead of direct import.
- [x] **3.4. Entity Consolidation**
    - Merged `entities/board` into `entities/game`.
    - **Result:** Zero circular dependencies between entities.

**Final Status:** 0 Lint Errors. FSD Compliance Achieved.
