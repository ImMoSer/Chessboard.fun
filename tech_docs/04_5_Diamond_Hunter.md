# 4.5 Diamond Hunter (The Killer Feature)

**Diamond Hunter** is the flagship mode of the platform, combining opening theory, deep tactical analysis, and memory training into a single, high-stakes gameplay loop.

## Concept
The mission of a "Diamond Hunter" is to find and "secure" the rarest chess moves—**Diamonds**. A Diamond is a move that is not just strong, but brilliant (`!!`), often involving a sacrifice or a non-obvious refutation of a subtle mistake.

## The Gameplay Loop: "Hunt & Secure"
Unlike any other trainer, Diamond Hunter uses a unique four-phase loop:

### Phase 1: The Hunt (Gravity Guidance)
The user plays or follows a game guided by the **Gravity Map**.
- **Arrows**: The UI displays up to 3 arrows (Green, Blue, Yellow) representing the moves with the highest "tactical gravity" (weight) in the position.
- **Indicators**: Moves are labeled with `!` or `!?` if they are close to a winning shot, helping the user stay within the "danger zone".

### Phase 2: The Trigger (System Blunder)
The sparing partner (bot) will intentionally play a **Blunder** (`??` - NAG 4) sourced from the Gravity Map. This creates an immediate requirement for punishment.

### Phase 3: The Punishment (Solving)
The user must identify and play the **Brilliant move** (`!!` - NAG 3) or the **Winning move** (`!!!` - NAG 255).
- If the user fails, the system rolls back the position and the blunder is replayed, forcing the user to try again.

### Phase 4: The Security (Replay Mode)
Finding the move is not enough. To "Secure" the Diamond and record it in the Hall of Fame:
- The user must **replay the entire game from move 1** up to the blunder from memory.
- Any mistake during the replay resets the process. This ensures that the user has truly internalized the line and the logic leading to the brilliance.

## The Gravity Engine
At the heart of this mode lies a specialized Python-based intelligence service (`brilliant_book`) utilizing **LMDB** high-performance databases.

### Classification Hierarchy:
- **`!!!` (Win - 255)**: A definitive finishing blow.
- **`!!` (Brilliant - 3)**: A difficult, high-impact move (the "Diamond").
- **`??` (Blunder - 4)**: A move that significantly drops the evaluation, used as puzzle triggers.
- **`□` (Only move - 7)**: Situations where only one specific path maintains the balance or win.

## Technical Details
- **Pre-calculated Gravity Map**: Classification is NOT performed in real-time. Instead, the system queries a massive, pre-calculated database of over 1.2 billion positions where moves have already been meticulously analyzed and tagged.
- **Dist Metric**: The "Distance" metric in the Gravity Map measures how close a move is to a forced sequence. Low distance indicates high tactical intensity.
- **High Performance**: Using **LMDB** allows for lightning-fast lookups (sub-millisecond), which is essential for the smooth rendering of arrows and fluid gameplay.
- **Persistence**: Secured Diamonds are stored in a local Dexie (IndexedDB) database and synced with Supabase for the global Hall of Fame.

## Goal
To transform the discovery of brilliant chess moves from a lucky accident into a repeatable, disciplined skill.

---
*Back to: [Game Modes Overview](./04_GameModes_Overview.md) | Next Section: [4.6 Open Sparring](./04_6_Open_Sparring.md)*
