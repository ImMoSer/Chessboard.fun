# 4.7 Repertoire & Theory (The Grandmaster's Studio)

**Repertoire** is the analytical heart of the platform. It is a high-performance environment designed for professional opening preparation, combining a flexible study tree with the deep theoretical intelligence of **MozerBook**.

## 1. Study Manager: Repertoire Lifecycle
The platform provides multiple entry points for building a repertoire, catering to different study habits:
- **Manual Construction**: Start from any position and build your lines move-by-move.
- **Expert Templates**: Access a curated library of professional opening "blueprints" (e.g., Sicilian Najdorf, King's Indian Defense) with predefined ECO structures.
- **PGN Intelligence**: Import external preparation or master-game PGNs for further analysis and customization.
- **AI-Powered Generation**: For those who seek a quick, data-driven start, the [Repertoire Generator](./04_7_Repertoire_Generator_Helper.md) can build entire trees based on Masters' statistics and selectable playstyles (GrossMaster, Master, Hustler).

## 2. The Interactive Study Tree
The user interface is optimized for managing vast amounts of theoretical variations without losing focus.
- **Recursive Navigation**: An infinite-depth tree structure that tracks every candidate move and sideline.
- **Visual Hierarchy**: Mainlines and variations are visually distinguished by font size and color coding (`pgn-lvl-main` through `pgn-lvl-4`), making complex structures readable at a glance.
- **Candidate Moves Panel**: A dedicated "Candidate Grid" at the bottom of the tree for rapid switching between variations, prioritizing the "Mainline" response.
- **Contextual Management**: A powerful right-click menu allows users to:
  - **Promote Variations**: Elevate a sideline to become the new mainline.
  - **Annotate**: Add standard chess Glyphs (NAGs) like `!!`, `??`, `±`, `+-` or rich-text comments.
  - **Prune & Clean**: Instantly delete unwanted branches to keep the preparation lean.

## 3. MozerBook: The Theoretical Compass
Linked directly to the Study Tree, the **MozerBook** panel provides real-time validation against the best known theory.
- **Multi-Source Data**: Toggle between **Lichess Masters** (Elite play), **Lichess Ratings** (Specific Elo-level trends), and the curated **MozerBook Green** database.
- **Trap Dashboard**: Indicators for known tactical traps for both sides (`WTrp` and `BTrp`), helping users avoid common pitfalls in the opening.
- **Winrate Analysis**: Visual bars representing White's success rate, with specialized "1-0 / 1/2 / 0-1" breakdowns tailored to the side to move.
- **WikiBooks Integration**: A high-impact panel that pulls encyclopedic data directly from the "Chess Opening Theory" project, providing context, history, and strategic ideas.

## 4. Training Phase: Replay Training (Recall Mode)
*Strategic Note: This feature completes the "Memorization Loop" of the studio.*
Once a repertoire is built, the user can enter **Recall Mode**:
- **System Sparring**: The platform plays the opponent's moves from your repertoire.
- **Active Recall**: You must find and play your "Hero moves" from memory.
- **Visual Validation**: The system provides immediate feedback on accuracy, ensuring you don't just "have" a repertoire, but actually "know" it.

## 5. Technical Architecture
- **Engine Synergy**: Uses Stockfish 18 for live validation during manual entry.
- **Cloud Persistence**: Full synchronization via **Supabase**. Repertoires saved in the browser (via **Dexie**) are backed up to the cloud, allowing for seamless transition from research at home to warm-up at a tournament.
- **Performance**: Capable of rendering and navigating trees with 10k+ nodes with sub-second latency.

## Goal
To provide a "Studio" experience where the player isn't just a consumer of theory, but an architect of it.

---
*Back to: [Game Modes Overview](./04_GameModes_Overview.md) | Next Chapter: [5. User Ecosystem & Economy](./05_User_Ecosystem_Economy.md)*
