# 🧩 Spezifikation: Adaptives Trainingsplan-System (V1.1)

Dieses Dokument dient als **Single Source of Truth** für Backend-Logik und Frontend-Darstellung.

---

# 1. 🎯 Streak-Mechanik & Fortschritt

## Definition „Erfolg“ (Auto-Complete)

Ein _echter Erfolg_ ist die vollständige Erfüllung aller im `tasks_json` definierten Aufgaben eines Tagesplans.

- **Trigger:** Bei jedem Aufruf von `GET /api/training-plan/current` wird der Fortschritt automatisch geprüft.
- **Verifizierung:** Die Summe der gelösten Puzzles (`puzzles_solved`) in `daily_mode_stats` muss für **jeden Modus, Sub-Modus und jedes Thema** den Zielwert (`count`) erreichen oder überschreiten.
- **Automatisierung:** Sobald 100% erreicht sind:
  - `is_completed: true` wird gesetzt
  - `current_streak` wird erhöht
  - `last_completed_plan_date` wird aktualisiert

➡️ Kein manueller Button erforderlich.

---

## Streak-Phasen & Strategien

Die Auswahl der Themen folgt einem zyklischen System über 30 Tage:

| Phase         | Tage  | Strategie                                     |
| :------------ | :---- | :-------------------------------------------- |
| **Discovery** | 0–9   | Breite Exploration des Themen-Pools           |
| **Weakness**  | 10–19 | Fokus auf Themen mit niedrigster Erfolgsquote |
| **Strength**  | 20–29 | Fokus auf stärkste Themen (Festigung)         |

---

## Grace Period (Nachhol-Logik)

- Der Plan vom **Vortag bleibt aktiv**
- Werden Aufgaben heute für gestern gelöst:
  - zählen diese vollständig
  - die Streak bleibt erhalten

- Nach Abschluss eines Nachhol-Plans:
  - kann sofort der aktuelle Tagesplan generiert werden

---

# 2. 📊 Volumen-Logik (Puzzles pro Tag)

## 🧠 Grundprinzip

- **Puzzles pro Thema bleiben konstant**
- **Schwierigkeit skaliert ausschließlich über die Anzahl der Themen**

Formel:

`Gesamtvolumen = (Puzzles pro Thema) × (Anzahl Themen) × (Anzahl Sub-Modi)`

---

## 🟢 Novice (1 Thema)

| Modus / Sub-Modus    | Puzzles / Thema | Themen | Gesamt  |
| :------------------- | :-------------: | :----: | :-----: |
| THEORY_ENDING (Win)  |        5        |   1    |    5    |
| THEORY_ENDING (Draw) |        5        |   1    |    5    |
| PRACTICAL_CHESS      |       10        |   1    |   10    |
| FINISH_HIM           |       20        |   1    |   20    |
| TORNADO (Bullet)     |       15        |   1    |   15    |
| TORNADO (Blitz)      |       15        |   1    |   15    |
| TORNADO (Rapid)      |       15        |   1    |   15    |
| TORNADO (Classic)    |       15        |   1    |   15    |
| **Gesamtvolumen**    |                 |        | **100** |

---

## 🔵 Pro (2 Themen)

| Modus / Sub-Modus    | Puzzles / Thema | Themen | Gesamt  |
| :------------------- | :-------------: | :----: | :-----: |
| THEORY_ENDING (Win)  |        5        |   2    |   10    |
| THEORY_ENDING (Draw) |        5        |   2    |   10    |
| PRACTICAL_CHESS      |       10        |   2    |   20    |
| FINISH_HIM           |       20        |   2    |   40    |
| TORNADO (Bullet)     |       15        |   2    |   30    |
| TORNADO (Blitz)      |       15        |   2    |   30    |
| TORNADO (Rapid)      |       15        |   2    |   30    |
| TORNADO (Classic)    |       15        |   2    |   30    |
| **Gesamtvolumen**    |                 |        | **200** |

---

## 🔴 Master (3 Themen)

| Modus / Sub-Modus    | Puzzles / Thema | Themen | Gesamt  |
| :------------------- | :-------------: | :----: | :-----: |
| THEORY_ENDING (Win)  |        5        |   3    |   15    |
| THEORY_ENDING (Draw) |        5        |   3    |   15    |
| PRACTICAL_CHESS      |       10        |   3    |   30    |
| FINISH_HIM           |       20        |   3    |   60    |
| TORNADO (Bullet)     |       15        |   3    |   45    |
| TORNADO (Blitz)      |       15        |   3    |   45    |
| TORNADO (Rapid)      |       15        |   3    |   45    |
| TORNADO (Classic)    |       15        |   3    |   45    |
| **Gesamtvolumen**    |                 |        | **300** |

---

## ✅ Klarstellung

> Die Anzahl der Aufgaben pro Thema bleibt **immer konstant**.
> Die Progression entsteht ausschließlich durch die steigende Anzahl paralleler Themen.

---

# 3. 🧠 Themen-Pools & Inkrementelle Progression

Ein Level enthält **immer alle Themen der vorherigen Stufe plus neue Themen**.

---

## 🌪️ TORNADO

| Level  | Status   | Themen                                                                           |
| :----- | :------- | :------------------------------------------------------------------------------- |
| Novice | Basis    | fork, pin, skewer, backRankMate, capturingDefender, promotion, trappedPiece      |
| Pro    | Advanced | + discoveredAttack, deflection, attraction, clearance, interference, doubleCheck |
| Master | Elite    | + quietMove, xRayAttack                                                          |

---

## 💀 FINISH_HIM

| Level  | Status   | Themen                                |
| :----- | :------- | :------------------------------------ |
| Novice | Basis    | pawn, rookPawn, bishop, knight, queen |
| Pro    | Advanced | + knightBishop, rookPieces            |
| Master | Elite    | + queenPieces, expert                 |

---

## ♟️ PRACTICAL_CHESS

| Level  | Status   | Themen                                |
| :----- | :------- | :------------------------------------ |
| Novice | Basis    | pawn, rookPawn, bishop, knight, queen |
| Pro    | Advanced | + knightBishop, exchange              |
| Master | Elite    | + materialEquality, extraPawn         |

---

## 📖 THEORY_ENDING

| Level        | Status   | Themen                                |
| :----------- | :------- | :------------------------------------ |
| Novice       | Basis    | pawn, rookPawn, bishop, knight, queen |
| Pro / Master | Advanced | + knightBishop, rookPieces            |

---

# 4. 🚀 Mastery & Status-Upgrades

- **Upgrade:**
  - Novice → Pro → Master nach jeweils **30 vollständig abgeschlossenen Tagen**

- **Reset:**
  - Streak wird beim Level-Up auf **0 zurückgesetzt**

- **Endless Mode:**
  - Ab **Master-Level** erfolgt kein weiterer Reset nach 30 Tagen

---

# ✅ Zusammenfassung

- Fortschritt basiert auf **vollständiger Plan-Erfüllung**
- Schwierigkeit entsteht durch **mehr Themen, nicht mehr Aufgaben**
- System passt sich dynamisch an über:
  - Streak
  - Erfolgsquoten
  - Trainingsphasen
