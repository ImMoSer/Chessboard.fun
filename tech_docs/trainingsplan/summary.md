# 🧩 Specification: Adaptive Training Plan System (V1.1)

This document serves as the **single source of truth** for both backend logic and frontend representation.

---

# 1. 🎯 Streak Mechanics & Progress

## Definition of "Success" (Auto-Complete)

A _true success_ is defined as the complete fulfillment of all tasks specified in `tasks_json` for a given day.

- **Trigger:** Progress is automatically checked on every call to `GET /api/training-plan/current`
- **Verification:** The total number of solved puzzles (`puzzles_solved`) in `daily_mode_stats` must meet or exceed the target (`count`) for **every mode, sub-mode, and theme**
- **Automation:** Once 100% is reached:
  - `is_completed: true` is set
  - `current_streak` is incremented
  - `last_completed_plan_date` is updated

➡️ No manual confirmation is required.

---

## Streak Phases & Strategy

Theme selection follows a 30-day cycle:

| Phase         | Days  | Strategy                                  |
| :------------ | :---- | :---------------------------------------- |
| **Discovery** | 0–9   | Broad exploration of the theme pool       |
| **Weakness**  | 10–19 | Focus on lowest success-rate themes       |
| **Strength**  | 20–29 | Focus on strongest themes (reinforcement) |

---

## Grace Period (Recovery Logic)

- The plan from the **previous day remains active**
- If tasks are completed today for yesterday:
  - they fully count
  - the streak is preserved

- After completing a recovery plan:
  - a new plan for the current day can be generated immediately

---

# 2. 📊 Volume Logic (Puzzles per Day)

## 🧠 Core Principle

- **Puzzles per theme remain constant**
- **Difficulty scales exclusively through the number of themes**

Formula:

`Total Volume = (Puzzles per Theme) × (Number of Themes) × (Number of Sub-Modes)`

---

## 🟢 Novice (1 Theme)

| Mode / Sub-Mode      | Puzzles / Theme | Themes |  Total  |
| :------------------- | :-------------: | :----: | :-----: |
| THEORY_ENDING (Win)  |        5        |   1    |    5    |
| THEORY_ENDING (Draw) |        5        |   1    |    5    |
| PRACTICAL_CHESS      |       10        |   1    |   10    |
| FINISH_HIM           |       20        |   1    |   20    |
| TORNADO (Bullet)     |       15        |   1    |   15    |
| TORNADO (Blitz)      |       15        |   1    |   15    |
| TORNADO (Rapid)      |       15        |   1    |   15    |
| TORNADO (Classic)    |       15        |   1    |   15    |
| **Total Volume**     |                 |        | **100** |

---

## 🔵 Pro (2 Themes)

| Mode / Sub-Mode      | Puzzles / Theme | Themes |  Total  |
| :------------------- | :-------------: | :----: | :-----: |
| THEORY_ENDING (Win)  |        5        |   2    |   10    |
| THEORY_ENDING (Draw) |        5        |   2    |   10    |
| PRACTICAL_CHESS      |       10        |   2    |   20    |
| FINISH_HIM           |       20        |   2    |   40    |
| TORNADO (Bullet)     |       15        |   2    |   30    |
| TORNADO (Blitz)      |       15        |   2    |   30    |
| TORNADO (Rapid)      |       15        |   2    |   30    |
| TORNADO (Classic)    |       15        |   2    |   30    |
| **Total Volume**     |                 |        | **200** |

---

## 🔴 Master (3 Themes)

| Mode / Sub-Mode      | Puzzles / Theme | Themes |  Total  |
| :------------------- | :-------------: | :----: | :-----: |
| THEORY_ENDING (Win)  |        5        |   3    |   15    |
| THEORY_ENDING (Draw) |        5        |   3    |   15    |
| PRACTICAL_CHESS      |       10        |   3    |   30    |
| FINISH_HIM           |       20        |   3    |   60    |
| TORNADO (Bullet)     |       15        |   3    |   45    |
| TORNADO (Blitz)      |       15        |   3    |   45    |
| TORNADO (Rapid)      |       15        |   3    |   45    |
| TORNADO (Classic)    |       15        |   3    |   45    |
| **Total Volume**     |                 |        | **300** |

---

## ✅ Clarification

> The number of puzzles per theme **never changes**.
> Progression is achieved solely by increasing the number of parallel themes.

---

# 3. 🧠 Theme Pools & Incremental Progression

Each level includes **all themes from previous levels plus newly introduced ones**.

---

## 🌪️ TORNADO

| Level  | Status   | Themes                                                                           |
| :----- | :------- | :------------------------------------------------------------------------------- |
| Novice | Base     | fork, pin, skewer, backRankMate, capturingDefender, promotion, trappedPiece      |
| Pro    | Advanced | + discoveredAttack, deflection, attraction, clearance, interference, doubleCheck |
| Master | Elite    | + quietMove, xRayAttack                                                          |

---

## 💀 FINISH_HIM

| Level  | Status   | Themes                                |
| :----- | :------- | :------------------------------------ |
| Novice | Base     | pawn, rookPawn, bishop, knight, queen |
| Pro    | Advanced | + knightBishop, rookPieces            |
| Master | Elite    | + queenPieces, expert                 |

---

## ♟️ PRACTICAL_CHESS

| Level  | Status   | Themes                                |
| :----- | :------- | :------------------------------------ |
| Novice | Base     | pawn, rookPawn, bishop, knight, queen |
| Pro    | Advanced | + knightBishop, exchange              |
| Master | Elite    | + materialEquality, extraPawn         |

---

## 📖 THEORY_ENDING

| Level        | Status   | Themes                                |
| :----------- | :------- | :------------------------------------ |
| Novice       | Base     | pawn, rookPawn, bishop, knight, queen |
| Pro / Master | Advanced | + knightBishop, rookPieces            |

---

# 4. 🚀 Mastery & Status Upgrades

- **Upgrade:**
  - Novice → Pro → Master after **30 fully completed days** each

- **Reset:**
  - Streak resets to **0** upon level-up

- **Endless Mode:**
  - At **Master level**, no further reset occurs after 30 days

---

# ✅ Summary

- Progress is based on **full completion of the daily plan**
- Difficulty scales via **more themes, not more tasks**
- The system adapts dynamically through:
  - streak progression
  - success rates
  - training phases
