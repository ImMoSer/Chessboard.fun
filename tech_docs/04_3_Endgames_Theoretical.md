# 4.3 Theoretical Endgames

**Theoretical Endgames** is a structured training environment designed to help players of all levels master fundamental endgame positions to perfection.

## Concept
Success in the endgame requires more than just knowing a winning formula; it requires the ability to execute it under pressure against stubborn defense. This mode allows users to practice classic positions with specific goals—either converting a win or holding a crucial draw.

## Training Configuration
The mode provides high granularity in selecting the training focus:

### 1. Task Type
- **Win**: Practice converting a theoretically winning position.
- **Draw**: Practice defending and holding a theoretically drawn position—a vital skill for practical tournament play.

### 2. Difficulty Levels
- **Novice**: Fundamental positions with straightforward solutions.
- **Pro**: Intermediate complexity requiring multi-step planning.
- **Master**: Advanced positions that challenge even grandmasters.

### 3. Categories (Endgame Types)
Users can select from 7 distinct categories:
- **Pawn Endgame** (The foundation)
- **Knight Endgame**
- **Bishop Endgame**
- **Knight vs Bishop**
- **Queen Endgame**
- **Rook & Pawn**
- **Rooks & Pieces**

## The "Human" Resistance (Sparring Partners)
A unique feature of this mode is the ability to choose your opponent. While **Stockfish 18** provides mathematically perfect defense, it often "gives up" in hopeless positions (e.g., retreating into a corner). 

We recommend training against our **Neural Network** partners for a more realistic "human" struggle:
- **Maia 1900 / 2200**: Trained to replicate human-like behavior and common error patterns.
- **BadGyal 8**: Sharp and aggressive, simulating a dangerous practical defender.

## Technical Implementation
- **Position Database**: Sourced from a curated collection of theoretical positions, categorized by material and difficulty.
- **Goal Verification**: The system verifies the final result (Mate, Stalemate, or 50-move rule/repetition for draws) against the initial task objective.
- **WDL Analysis**: Real-time monitoring of Win-Draw-Loss probabilities determines if the player is still on the right track.

---
*Back to: [Game Modes Overview](./04_GameModes_Overview.md) | Next Section: [4.4 Practical (Endgames)](./04_4_Endgames_Practical.md)*
