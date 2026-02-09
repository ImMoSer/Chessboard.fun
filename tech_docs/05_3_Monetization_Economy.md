# 5.3 Monetization & Economy (FunCoins & Tiers)

The platform operates on a unique "Active-First" economic model. While providing premium features, it rewards community engagement and tournament participation above all else.

## 1. The FunCoin Currency
**FunCoins** are the primary virtual currency used to interact with high-intensity features.
- **Usage**:
  - **Finish Him**: 10 FunCoins per attempt (reflects the high computational cost of the playout engine).
  - **Tacktics/Tornado**: 1 FunCoin per puzzle.
- **Replenishment**:
  - **Daily Allowance**: Every user receives a daily replenishment up to their tier's limit (e.g., 100 for Pawn tier).
  - **Testing Phase**: During the current beta, accounts are replenished every hour to facilitate exhaustive testing.

## 2. Subscription Tiers (Role-Based)
The user's status is visually represented by chess piece icons, determining their daily limits and cloud storage capacity.

| Tier | Icon | Daily FunCoins | Cloud Storage | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Pawn** | ♟ | 100 | Standard | Basic |
| **Knight** | ♞ | 200 | Extended | Premium |
| **Bishop** | ♝ | 500 | Extended | Premium |
| **Rook** | ♜ | 5,000 | Priority | Elite |
| **Queen** | ♛ | 10,000 | Unlimited | Grandmaster |

## 3. The "Club Bonus" System (Play-to-Earn)
In a departure from traditional "Pay-to-Win" models, the platform integrates deeply with the **Lichess Club** ecosystem.
- **Automatic Upgrades**: The system analyzes a player's activity in team tournaments over the last 30 days.
- **Activity Points**: Points are awarded for participation, points scored, and games played in club events.
- **Thresholds**:
  - **Knight**: 50+ Activity Points.
  - **Bishop**: 150+ Activity Points.
  - **Rook**: 300+ Activity Points.
- **Dynamic Recalculation**: Tiers are updated automatically. This ensures that the most active club members always have free access to premium tools.

## 4. Technical Infrastructure
- **Payment Processing**: (Future Integration) Planned support for standard gateways.
- **Anti-Abuse**: Cloud-side validation of currency spending via **Supabase Functions** to prevent client-side manipulation.

---
*Back to: [Project Overview](../01_Project_Overview_Mission.md)*
