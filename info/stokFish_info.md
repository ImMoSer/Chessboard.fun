# Walkthrough: Modern Stockfish NNUE Integration

We have successfully refactored the chess engine integration to use modern, clean, and maintainable architecture. We moved away from manual file management in `public/` folder to a proper npm-based workflow.

## Key Accomplishments

### 1. Unified Engine Architecture
We streamlined the engine options into two robust choices:
- **Main Engine (NNUE)**: Powered by `@lichess-org/stockfish-web`. This is a WebAssembly build with an **embedded** efficient NNUE network (SmallNet). It supports multi-threading and provides high-level analysis.
- **Fallback Engine**: A reliable single-threaded build from the `stockfish` npm package (v17+ Lite). Used for devices that don't support `SharedArrayBuffer` or multi-threading.

### 2. Automated Asset Management
Instead of manually copying binary files:
- We use `vite-plugin-static-copy` to automatically extract the necessary `.wasm` and `.js` files from `node_modules` into the `dist/` folder during the build process.
- The system logic in `engine.loader.ts` has been simplified to point to these standard paths (`/stockfish/nnue/...` and `/stockfish/single/...`).

### 3. User Interface Simplification
- Removed the confusing "Lite vs Pro" profile selector. The system now automatically provides the best available engine (NNUE if supported, Single-Threaded otherwise).
- Retained the **Threads Selector** for performance tuning.

## Technical Implementation Details

### Engine Loading Logic
The loading logic is now centralized and purely functional:
- Checks for `crossOriginIsolated` (required for multi-threading).
- If available -> Loads the NNUE engine.
- If not available -> Falls back gracefully to the single-threaded engine.

### Configuration
Everything is managed via `vite.config.ts` and `package.json`. No more magic files in `public`.

## Maintenance & Updates

### How to Update
1.  Run `pnpm update @lichess-org/stockfish-web stockfish` to get the latest engine versions.
2.  The build process takes care of the rest.

## Cleanup
- Removed all legacy folders (`public/stockfish_*`).
- Fixed TypeScript errors related to engine profiles and analysis data structures.