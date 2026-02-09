# 2. Technical Stack

A modern, high-performance chess application requires a robust and specialized technology stack. Below is the detailed breakdown of the tools and languages powering each layer of the platform.

## Frontend (The UI Layer)
The frontend is designed for high-interactivity and high-performance rendering of chess positions. It is built as a Single Page Application (SPA).

- **Framework**: [Vue.js 3.5+](https://vuejs.org/) (Composition API)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Build Tool**: [Vite 7.x](https://vitejs.dev/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **UI Component Library**: [Naive UI](https://www.naiveui.com/)
- **Chess Visualization**:
  - `Chessground`: High-performance chessboard rendering (by Lichess).
  - `Chessops`: Modular library for move generation and legality checks.
- **Data Visualization**: [Apache ECharts](https://echarts.apache.org/) (for training progress and statistics).
- **Internationalization**: `vue-i18n` (Multi-language support).

## Backend (The Core Intelligence)
The backend services manage user state, engine orchestration, and database interactions.

- **Framework**: [NestJS 11.x](https://nestjs.com/) (Node.js framework for scalable server-side applications).
- **Language**: [TypeScript](https://www.typescriptlang.org/).
- **Database ORM**: [TypeORM](https://typeorm.io/).
- **API Protocol**: REST (with OpenAPI/Swagger documentation).
- **Communication**: [Axios](https://axios-http.com/) (for inter-service and external API calls).
- **Task Scheduling**: Integrated NestJS Cron jobs for analysis tasks.

## Engines & AI (The "Heavy lifting")
A distributed engine architecture provides the specialized computations required for analysis and sparring.

- **Analysis Engine**: [Stockfish 18](https://stockfishchess.org/) (C++).
- **Human-like engines**:
  - [LCZero 32.0](https://lczero.org/) (Neural Network engine).
  - **Maia Weights**: Specialized neural network weights for human-like move prediction.
    - `maia-1900.pb.gz`: Simulates club-level human play.
    - `maia-2200.pb.gz`: Simulates master-level human play.
  - **BadGyal Weights**: Aggressive and classification-heavy weights.
    - `badgyal-8.pb.gz`: Optimized for sharp, tactical move classification.
- **External Intelligence**: [n8n.io](https://n8n.io/) (Visual workflow automation) for complex backend logic and webhook processing.

## Data & Infrastructure
- **Primary Database**: [PostgreSQL](https://www.postgresql.org/) (via [Supabase](https://supabase.com/)).
- **Local/Caching**: [SQLite3](https://www.sqlite.org/).
- **Containerization**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/).
- **Package Manager**: [pnpm](https://pnpm.io/) (for fast and disk-efficient dependency management).

---
*Back to: [Project Overview & Mission](./01_Project_Overview_Mission.md)* | *Next Chapter: [Architecture Overview](./03_Architecture_Overview.md)*
