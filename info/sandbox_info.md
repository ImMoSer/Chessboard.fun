# Sandbox Mode Documentation

## 1. Overview

The Sandbox mode is a special gameplay feature that allows any user (including guests) to start a game against a local engine from any given FEN (Forsyth-Edwards Notation) position. Its primary purpose is to provide a quick and easy way to play out specific chess positions without the need for puzzles or predefined scenarios.

Users can access this mode via a dedicated URL or by inputting a FEN string directly into the UI.

---

## 2. User-Facing Features

- **URL-Based Game Start**: A game can be initiated by navigating to a URL in the format `.../sandbox/play/{FEN}`. The FEN string in the URL must replace spaces with underscores (`_`).
  - *Example*: `/sandbox/play/5k2/8/8/8/1P6/8/8/3K4_w_-_-_0_1`

- **Custom FEN Input**: The UI provides a text field where users can paste a FEN string. Clicking the "Play" button updates the URL and starts a new game from that position.

- **User Always Moves First**: A key feature of the Sandbox is that the user always plays the side whose turn it is according to the FEN. If the FEN specifies White to move (`w`), the user plays as White, and the board is oriented accordingly.

- **Fixed Opponent**: The opponent is always the same local engine: `SF_2200` ('Rbleipzig 2350+'). There is no option to change the opponent.

- **Game Controls**: The standard `ControlPanel` is available with the following behavior:
  - **Restart**: Restarts the game from the initial FEN position loaded from the URL.
  - **Resign**: Ends the current game. After resigning, the analysis feature becomes available.
  - **Share**: Generates a shareable link to the current board position in the Sandbox mode format.

- **No Authentication Required**: This mode is fully accessible to all users, whether they are logged in or not.

---

## 3. Technical Implementation

This section details the core components and logic involved in the Sandbox mode for developers.

### Routing (`src/router/index.ts`)

- A new route was added: `/sandbox/play/:fen(.+)`.
- The `:fen(.+)` part is crucial to correctly capture FEN strings, which contain slashes.
- The route's `meta` object is set to `{ isGame: true, game: 'sandbox' }`. This integrates with the global `router.beforeEach` navigation guard to handle confirmations when a user navigates away from an active game. `requiresAuth` is intentionally omitted.

### Main View (`src/views/SandboxView.vue`)

- This is the main component for the mode.
- It uses `GameLayout.vue` for the overall structure and includes the `ControlPanel` and `AnalysisPanel` components in the `right-panel` slot.
- It contains a `watch` on `route.params.fen` which triggers the `gameStore.startSandboxGame` action whenever the URL changes.
- It also contains a `watch` on `gameStore.gamePhase` to dynamically set the available controls (Restart, Resign, etc.) by calling `controlsStore.setControls`.

### Game Logic (`src/stores/game.store.ts`)

- **`startSandboxGame(rawFen: string)`**: This is the primary action for the mode.
  1.  It replaces underscores `_` in the `rawFen` string with spaces.
  2.  **Validation**: It validates the FEN using `parseFen` from the `chessops/fen` library within a `try...catch` block. `parseFen(fen).unwrap()` throws an error if the FEN is invalid.
  3.  **Error Handling**: On catching a validation error, it calls `uiStore.showConfirmation` to display a modal window to the user.
  4.  **Engine Setup**: It calls `controlsStore.setSandboxEngine()` to force the opponent to `SF_2200`.
  5.  **Game Setup**: It then calls the generic `setupPuzzle` function with an empty move list (`[]`) and callbacks tailored for this mode.

- **`setupPuzzle` Modification**: The `setupPuzzle` function was modified to handle the "user always moves first" logic.
  ```typescript
  let humanPlayerColor: ChessgroundColor;

  if (mode === 'sandbox') {
    humanPlayerColor = setup.turn; // User plays the side to move
  } else {
    const botTurnColor = setup.turn;
    humanPlayerColor = botTurnColor === 'white' ? 'black' : 'white';
  }
  boardStore.setupPosition(fen, humanPlayerColor);
  ```
  This ensures the board is oriented correctly and the user makes the first move.

### Controls & Sharing

- **`src/stores/controls.store.ts`**: A new action `setSandboxEngine()` was added to programmatically set `selectedEngine` to `'SF_2200'`.
- **`src/services/share.service.ts`**: The `ShareMode` type was extended to include `'sandbox'`, and the `share` function was updated to construct the correct `/sandbox/play/...` URL.

---

## 4. Future Improvements

- **Enhanced FEN Validation**: The current validation just shows a generic "Invalid FEN" message. This could be improved to provide more specific details about the error.
- **Engine Selection**: While currently fixed, the UI could be extended in the future to allow users to select their opponent engine within Sandbox mode.
- **Game History**: For logged-in users, sandbox games could be saved to their personal game history for later review.
