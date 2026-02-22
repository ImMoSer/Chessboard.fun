# Architectural Audit Plan: Feature-Sliced Design (FSD) Compliance

This document outlines the step-by-step plan for auditing the `chess-frontend` codebase. The goal is to rigorously evaluate adherence to FSD principles, identify "Distributed Monolith" symptoms, and assess the system's maintainability using the Architecture Tradeoff Analysis Method (ATAM) and Architectural Fitness Functions.

## Phase 1: Architectural Fitness Functions (Static Analysis)

**Objective:** Verify strict isolation rules and dependency direction using static analysis (grep/search). This phase detects clear violations of the FSD "Constitution".

### 1.1. Unidirectional Flow Verification (Vertical Isolation)
*   **Hypothesis:** Lower layers (`shared`, `entities`) must NOT import from higher layers (`features`, `widgets`, `pages`, `app`).
*   **Checks:**
    *   [ ] Search for imports from `@/features`, `@/widgets`, `@/pages` inside `src/entities`.
    *   [ ] Search for imports from `@/entities`, `@/features`, `@/widgets` inside `src/shared`.
    *   **Success Metric:** 0 matches.

### 1.2. Slice Isolation Verification (Horizontal Isolation)
*   **Hypothesis:** A slice (e.g., `features/auth`) must NOT import directly from another slice (e.g., `features/chat`). Interaction must occur via the Public API or upper layers.
*   **Checks:**
    *   [ ] Search for cross-imports between siblings in `src/features`.
    *   [ ] Search for cross-imports between siblings in `src/entities`.
    *   **Success Metric:** 0 direct cross-imports.

### 1.3. Public API & Encapsulation Verification
*   **Hypothesis:** Modules should expose their functionality *only* via `index.ts`. Deep imports (e.g., `import X from '@/features/auth/ui/LoginForm.vue'`) are forbidden.
*   **Checks:**
    *   [ ] Verify existence of `index.ts` in the root of every slice in `features` and `entities`.
    *   [ ] Search for "Deep Imports" (imports from subdirectories of slices) throughout the codebase.
    *   **Success Metric:** All slices have `index.ts`; Deep imports are minimized/eliminated.

## Phase 2: Scenario-Based Analysis (ATAM)

**Objective:** Evaluate the architecture's resilience by mentally simulating realistic change scenarios. This reveals coupling that static analysis might miss.

### 2.1. Scenario A: Feature Removal (Modifiability)
*   **Scenario:** "We want to completely remove the `MozerBook` feature."
*   **Simulation:**
    *   Identify all entry points for `MozerBook`.
    *   Check for hardcoded references in `entities`, `shared`, or other `features`.
    *   **Question:** Will the application build if the `src/features/mozer-book` directory is deleted? Or is it entangled?

### 2.2. Scenario B: Core Logic Change (Cohesion)
*   **Scenario:** "We are changing the move validation logic in the `Board` entity."
*   **Simulation:**
    *   Trace where validation logic currently lives.
    *   Check if logic is leaked into `features` (e.g., `analysis` or `game-launcher`).
    *   **Question:** Do we have to modify 5 different files in different layers to change one rule?

### 2.3. Scenario C: Engine Replacement (Abstraction)
*   **Scenario:** "Replace Stockfish with a cloud-based analysis API."
*   **Simulation:**
    *   Examine `entities/engine` and `features/engine`.
    *   **Question:** Is the engine logic decoupled behind an interface/adapter, or is the specific Stockfish implementation leaking into UI components?

## Phase 3: God Objects & Complexity Analysis

**Objective:** Identify implementation anti-patterns that hinder maintainability, specifically "God Classes" and SRP violations.

### 3.1. Large File Detection
*   **Action:** Scan for files in `entities` and `features` exceeding 300 lines of code.
*   **Analysis:**
    *   [ ] Read the top 3 largest files.
    *   [ ] Determine if they mix concerns (e.g., UI state + API calls + Business Logic).

### 3.2. Store Analysis (State Management)
*   **Action:** Examine Pinia stores (e.g., `diamondHunter.store.ts` mentioned in the manifest).
*   **Analysis:**
    *   [ ] Does the store handle data fetching directly?
    *   [ ] Does it contain complex business rules that belong in a pure function/domain model?
    *   [ ] Is it acting as a "God Object" linking unrelated parts of the system?

## Phase 4: Reporting & Scoring

**Objective:** Synthesize findings into actionable data.

### 4.1. The Audit Report
Create a final report (`audit_report.md`) containing:
1.  **Critical Violations List:** Specific file paths and import lines violating FSD.
2.  **Architectural Debt:** Areas requiring refactoring (e.g., missing Public APIs, God Objects).
3.  **ATAM Score (0-10):**
    *   *Modifiability:* How easy is it to change/remove features?
    *   *Isolation:* How well are layers separated?
    *   *Cohesion:* Is related logic kept together?

### 4.2. Action Plan
*   Prioritized list of refactoring tasks based on the audit findings.
