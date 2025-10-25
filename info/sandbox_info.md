# Sandbox Mode Documentation

## 1. Overview

The Sandbox mode is a flexible gameplay feature allowing any user to start a game against a selected engine from any FEN position. It's designed for quick analysis and gameplay of specific chess scenarios.

Key features of the Sandbox are its dynamic engine selection and an optional parameter to specify the user's playing color, both integrated directly into the URL. This allows for easy sharing of exact game scenarios.

---

## 2. User-Facing Features

- **URL-Based Game Start**: A game is initiated via a URL. The primary format is `.../sandbox/play/{engineId}/{userColor}/{FEN}`.
  - **`{engineId}`**: The ID of the engine to play against (e.g., `SF_2200`, `MOZER_2000`).
  - **`{userColor}`** (Optional): The color the user will play (`white` or `black`).
  - **`{FEN}`**: The FEN string, with spaces replaced by underscores (`_`).
  - _Example_: `/sandbox/play/MOZER_2000/black/5k2/8/8/8/1P6/8/8/3K4_w_-_-_0_1`

- **Player Color Logic**:
  - **If `userColor` is specified**: The user plays as that color. The board is oriented accordingly. If it is not that color's turn to move according to the FEN, the engine will make the first move.
  - **If `userColor` is omitted**: The user plays as the color whose turn it is in the FEN (the default behavior).

- **Legacy URL Redirection**: Older URL formats are automatically redirected.
  - `/sandbox/play/{engineId}/{FEN}`: This format (without `userColor`) is still valid and works as before.
  - `/sandbox/play/{FEN}`: Redirected to a URL with a default engine (`SF_2200` for guests, or the user's last-used engine for authenticated users) and no `userColor`.

- **Engine Selection**: Changing the engine in the UI updates the URL, preserving the `userColor` if it was present.

- **Guest User Authentication for Server Engines**: This behavior is unchanged. If a guest tries to use a server engine, they are prompted to log in or switch to a default local engine. The `userColor` parameter is preserved during this process.

- **Custom FEN Input**: Clicking "Play" after entering a FEN constructs a new URL with the currently selected engine and preserves the `userColor` from the current URL (if any).

- **Game Controls**:
  - **Restart**: Restarts the game from the initial FEN, respecting the engine and user color from the URL.
  - **Resign**: Ends the current game.
  - **Share**: Generates a shareable link that includes the engine and the user's color.

---

## 3. Technical Implementation

### Routing (`src/router/index.ts`)

- Three routes now manage the Sandbox mode:
  1.  `path: '/sandbox/play/:engineId/:userColor(white|black)/:fen(.+)'`
  - `name: 'sandbox-with-engine-and-color'`
  - The primary route that handles games with a specified engine and user color.
  2.  `path: '/sandbox/play/:engineId/:fen(.+)'`
  - `name: 'sandbox-with-engine'`
  - Handles games without an explicit user color.
  3.  `path: '/sandbox/play/:fen(.+)'`
  - `name: 'sandbox'`
  - A legacy route that is redirected to `'sandbox-with-engine'`.

### Main View (`src/views/SandboxView.vue`)

- The `watch` on `route.fullPath` is the entry point.
- **Logic Flow on Route Change**:
  1.  It extracts `engineId`, `userColor`, and `fen` from `route.params`.
  2.  The logic for handling missing `engineId` (legacy URLs) remains the same: it redirects to add a default engine.
  3.  The server engine authentication for guests remains the same, but the redirection logic now preserves the `userColor` parameter if it exists.
  4.  Finally, it calls `loadGameFromFen(fen, userColor)`, passing both the FEN and the (potentially undefined) user color.

### State Management (`src/stores/game.store.ts`)

- **`startSandboxGame(rawFen: string, userColor?: ChessgroundColor)`**: This action now accepts the optional `userColor` and passes it directly to `setupPuzzle`.

- **`setupPuzzle(..., userColor?: ChessgroundColor)`**: The signature is updated.
  - The logic for determining the player's color in sandbox mode was changed:
    ```typescript
    if (mode === 'sandbox') {
      humanPlayerColor = userColor || setup.turn; // Use specified color, or fallback to FEN turn
    } else { ... }
    ```
  - After setting up the position, the existing logic automatically handles the engine's first move if it's not the user's turn:
    ```typescript
    if (setup.turn !== humanPlayerColor) {
      _triggerBotMove()
    }
    ```

### Sharing (`src/services/share.service.ts`)

- The `share` function signature was updated to accept an optional `userColor`.
- When `mode` is `'sandbox'`, it constructs the URL including the `userColor` if it is provided, fitting the new `/sandbox/play/{engineId}/{userColor}/{id}` format.
