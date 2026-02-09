# 4.2 Tornado (Tactical Time-Assault)

**Tornado** is a high-intensity training mode designed to sharpen pattern recognition and tactical speed. It simulates the pressure of time trouble in real games.

## Concept
In **Tornado**, the user must solve a sequence of puzzles within a strict time limit. Unlike other modes, speed is just as important as accuracy. The mode focuses on "tactical flow"—the ability to see simple and medium-difficulty patterns instantly.

## Time Controls
Users can choose from four standard time controls, each with an initial bank and an increment per correct move:
- **Bullet**: 1 minute + 1 second increment
- **Blitz**: 3 minutes + 2 seconds increment
- **Rapid**: 5 minutes + 3 seconds increment
- **Classic**: 10 minutes + 5 seconds increment

*Note: Increments are only applied if the remaining time is above 10 seconds, encouraging consistent speed.*

## Key Features
- **Theme Specialization**: Users can focus their training on specific tactical motifs (e.g., Pins, Forks, Skewers, Back-rank mates) or choose "Auto" for a balanced mix.
- **Session Rating**: Each session has its own tactical rating that evolves based on the difficulty of solved puzzles and the speed of execution.
- **Mistake Review**: At the end of a session, all failed puzzles are saved in a temporary "Mistakes" buffer for immediate review and correction.
- **Audio Feedback**: Includes localized audio warnings (e.g., 10-second and 8-second warnings) to keep the player focused.

## Technical Implementation
- **Frontend Timer**: Precise Client-side timer management in `tornado.store.ts` with synchronization to the server at the beginning and end of the session.
- **Dynamic Puzzle Selection**: Puzzles are fetched sequentially from the server. The difficulty is adjusted in real-time based on the current session rating.
- **Session Persistence**: While the timer is client-side for responsivity, the session state and final results are verified and stored in the backend to ensure fair rankings.

## Goal
To build "muscle memory" for tactical patterns, allowing players to find winning shots even during extreme time pressure.

---
*Back to: [Game Modes Overview](./04_GameModes_Overview.md) | Next Section: [4.3 Endgames (Theoretical)](./04_3_Endgames_Theoretical.md)*
