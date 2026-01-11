# Walkthrough: Enhanced Stockfish NNUE Integration

We have successfully upgraded the chess engine to support NNUE (Efficiently Updatable Neural Network) and implemented a flexible system that allows users to choose between a lightweight "Lite" engine and a more powerful "Pro" engine.

## Key Accomplishments

### 1. Dual Engine Support & Fallback
We identified and integrated three distinct Stockfish WASM builds:
- **Lite Profile**: A compact ~13MB WASM core paired with an external ~12MB NNUE network (`nn-4fd273888b72.nnue`). Used for threads-enabled analysis.
- **Pro Profile**: A high-performance ~48MB WASM build with an embedded large NNUE network. Used for deep analysis.
- **Single-Threaded Build**: A stable ~1.6MB build (`stockfish.js` v10.0.2) restored to `public/stockfish_single/`. Used as a fallback and for local gameplay.

### 2. Dynamic Engine Loading
Refactored `engine.loader.ts` to support named profiles. The system now:
- Fetches and injects the NNUE network into the virtual file system for the Lite build.
- Automatically handles the large embedded network for the Pro build.
- Transparently switches between multi-threaded and single-threaded managers based on browser capabilities.

### 3. User Interface & Persistence
- Added a **Profile Selector** to the Analysis Panel toolbar.
- Added a **Threads Selector** with automatic hardware concurrency detection.
- User preferences for both the engine profile and thread count are persisted in `localStorage`.

## Technical Implementation Details

### Engine Profiles Configuration
```typescript
const ENGINE_CONFIGS: Record<EngineProfile, EngineConfig> = {
  lite: {
    loaderPath: '/stockfish_nnue/stockfish.js',
    networkPath: '/stockfish_nnue/nn-4fd273888b72.nnue',
    networkFilename: 'nn-4fd273888b72.nnue',
  },
  pro: {
    loaderPath: '/stockfish_nnue_big/stockfish.js',
  },
}
```

### UI Components
- [EngineLines.vue](file:///c:/PROJEKTS/CHESS_APP/chess_frontend/src/components/Analysis/EngineLines.vue): Updated with new selectors and tooltips.
- [AnalysisStore.ts](file:///c:/PROJEKTS/CHESS_APP/chess_frontend/src/stores/analysis.store.ts): Manages state, loading, and persistence.

## Verification
- Verified that switching profiles via the UI triggers a clean engine restart.
- Confirmed that the "Pro" engine correctly reports using its embedded high-quality network.
- Tested persistence by refreshing the page and checking the active engine profile.

## Maintenance & Updates

### Engine Sources
- **Lite Profile**: Uses a standard Stockfish WASM wrapper with an external NNUE network (`nn-4fd273888b72.nnue`).
- **Pro Profile**: Uses Stockfish 17 with an embedded NNUE network, sourced from the `stockfish-nnue.wasm` NPM package.

### How to Update
1.  **Engine Builds**: To update the Stockfish WASM files, you can check the latest releases of [stockfish.js](https://www.npmjs.com/package/stockfish) or [stockfish-nnue.wasm](https://www.npmjs.com/package/stockfish-nnue.wasm) and replace the files in `public/stockfish_nnue/` or `public/stockfish_nnue_big/`.
2.  **NNUE Networks**: New networks can be downloaded from the [official Stockfish networks gallery](https://tests.stockfishchess.org/nns). After downloading a `.nnue` file, place it in `public/stockfish_nnue/` and update the `ENGINE_CONFIGS` in [engine.loader.ts](file:///c:/PROJEKTS/CHESS_APP/chess_frontend/src/utils/engine.loader.ts).

## Cleanup & Verification
- Removed ~150MB of unused legacy engine files and experimental NNUE networks.
- Verified system stability with `pnpm type-check` (passed with 0 errors).

> [!TIP]
> Use the **Pro** profile for deep analysis and the **Lite** profile for quick checks or on mobile devices to save bandwidth and memory.
