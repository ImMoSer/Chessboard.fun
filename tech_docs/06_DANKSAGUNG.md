# 6. DANKSAGUNG (Conclusion & Credits)

## 👨‍💻 About the Author

Hello! My name is **Moser**. I was born in 1985 in Kazakhstan and have been living in Germany since 2003.

By trade, I'm a mechanical engineer with a lifelong passion for chess. **Chessboard.fun** is a long-held dream of mine: to create a professional-grade training tool that empowers players to study effectively. This project only became possible thanks to the convergence of modern AI technologies and the power of the **n8n** automation platform.

I am fluent in Russian and German, and I am continually improving my English as I collaborate with the global chess community.

Thank you for being part of this journey!

---

## 🏛️ DANKSAGUNG (Technical Foundations)

Implementing a platform of this scale and complexity would have been impossible without the incredible open-source tools and data provided by the chess and technology communities. I would like to express my deepest gratitude to the following projects:

### 1. The Intelligence Layer
Our analytical depth is powered by the giants of modern chess engine development:
*   **[Stockfish (Web Edition)](https://github.com/lichess-org/stockfish-web)**: The world's strongest chess engine, serving as our primary evaluator.
*   **[Leela Chess Zero (LCZero)](https://lczero.org/)**: The engine that hosts our neural network weights. [GitHub](https://github.com/LeelaChessZero/lc0).
*   **[Maia Chess](https://maiachess.com/)**: For providing human-like move prediction. [GitHub](https://github.com/CSSLab/maia-chess) | [Lichess Bot](https://lichess.org/@/maia1).
*   **[dkappe (Weights)](https://github.com/dkappe/leela-chess-weights/wiki/Bad-Gyal)**: A special thanks for the specialized **"Bad Gyal"** Leela Chess Zero weights, which are critical for our advanced move classification.

### 2. Logic & Visualization
*   **[Chessops](https://github.com/niklasf/chessops)**: The modular logic library used for move generation, legality checks, and PGN handling.
*   **[Chessground](https://github.com/lichess-org/chessground)**: The high-performance interactive board renderer from the Lichess team.

### 3. Data & Theory
*   **[Lichess.org - API & Open Database](https://lichess.org/api)**: The foundation of our puzzle ecosystem and player integration.
    *   **[Lichess Puzzle Database](https://database.lichess.org/#puzzles)**
    *   **[Lichess Evaluation Database](https://database.lichess.org/#evals)**
*   **[supertorpe's Chess Endgame Training](https://github.com/supertorpe/chessendgametraining)**: A vital source for our collection of theoretical endgame positions. Thank you, supertorpe, for this incredible assembly!

### 4. Infrastructure & Community
*   **[n8n.io](https://n8n.io/)**: The flexible workflow automation platform that serves as the "nervous system" of our backend orchestration.
*   **Community & Contributors**: To everyone who has provided feedback, reported bugs, or suggested features — your input drives the evolution of the platform.

---

## 🤝 Contributing & Community

We welcome all contributions to make **Chessboard.fun** the best training tool available!

If you have ideas, suggestions, or have found a bug:
1.  **[Create an Issue](../../issues)** to discuss your idea.
2.  **Fork the repository** and build your own improvements.
3.  **Submit a Pull Request** to merge your changes into the main project.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0**. In accordance with the GPLv3, our source code is open and available for the benefit of the global chess community.

---
*Back to: [Project Overview](../01_Project_Overview_Mission.md)*
