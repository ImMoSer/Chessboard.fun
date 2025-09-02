# Chessboard.fun

An interactive web platform for chess enthusiasts, offering unique training modes, detailed statistics, and powerful analysis tools.

## 🎯 Main Features

### Training Modes

- **🎯 Finish-Him (Conversion)** - Solve tactical puzzles and prove your advantage in endgames against Stockfish
- **⚡ Speedrun** - Timed tactical puzzles with difficulty ranging from Candidate Master to Grandmaster
- **⚔️ Attack** - Face positions requiring decisive combinations or powerful attacks to checkmate
- **🧠 Automatic Tactical Trainer** - AI-powered personalized training across 25 tactical themes

### Analysis & Statistics

- **📊 Club Statistics** - Detailed statistics and leaderboards for Lichess chess clubs
- **🏠 User Dashboard** - Personal statistics, favorite puzzles, and Lichess activity
- **🔍 Analysis Panel** - Position analysis with Stockfish engine, variations, and PGN support

## 🤖 Available Chess Bots

Choose from several training bots with different skill levels:

| Bot       | Rating | Engine          | Configuration                   |
| --------- | ------ | --------------- | ------------------------------- |
| Rbleipzig | 2200+  | Stockfish.js    | depth 12, contempt 100          |
| Krokodil  | 2100+  | Stockfish.js    | depth 10, contempt 100          |
| Karde     | 2000+  | Stockfish.js    | depth 8, contempt 100           |
| MoZeR     | 1900+  | LCZero+Maia1900 | Human-like engine (server-side) |
| Dimas     | 1800+  | Stockfish.js    | depth 6, contempt 100           |
| Darko     | 1700+  | Stockfish.js    | depth 4, contempt 100           |

## 🛠️ Tech Stack

- **Frontend**: TypeScript, Vue.js
- **Backend**: n8n.io + Nest.js (for webhook processing and API)
- **Chess Logic**: `chessops`
- **Board Rendering**: `Chessground`
- **Chess Engines**:
  - Local: `Stockfish.js` + `Stockfish.wasm`
  - Server: `LCZero` + `Maia 1900`
- **API**: [Lichess API](https://lichess.org/api)

## 🌐 Key Features

- **🔗 Lichess Integration** - Login via Lichess account with full profile integration
- **📈 Advanced Statistics** - Track tactical ratings, conversion ratings, games played, and FunCoins
- **🧩 Lichess Puzzle Database** - Built on the comprehensive [Lichess puzzle database](https://database.lichess.org/#puzzles)
- **🎨 Modern UI** - Clean, responsive interface built with TypeScript and Vue.js
- **🌍 Localization** - Available in English, German, and Russian

## 🤝 Contributing

We welcome all contributions! If you have ideas, suggestions, or found a bug:

1. Create an [issue](../../issues) to discuss your idea
2. Fork the repository
3. Create your feature branch
4. Submit a [pull request](../../pulls)

## 📄 License & Acknowledgements

This project is licensed under the **GNU General Public License v3.0**.

### Chess Engines

#### Stockfish Chess Engine

Game and move analysis powered by [Stockfish](https://stockfishchess.org/), an open-source chess engine distributed under GPLv3.

> **Important**: Due to GPLv3 requirements, our source code is available under the same license. You can read the full text [here](https://www.gnu.org/licenses/gpl-3.0.html).

#### Maia Chess Engine

Human-like moves on the server are provided by **Maia Chess**, a project designed to play chess like a human. Maia uses neural networks trained on millions of human games to predict moves a player at a specific rating level would make.

- [Website](https://maiachess.com/)
- [GitHub](https://github.com/CSSLab/maia-chess)
- [Lichess Bot](https://lichess.org/@/maia1)

#### Leela Chess Zero (LCZero)

To run Maia Chess neural network weights, the server uses **Leela Chess Zero**, another powerful open-source neural network chess engine.

- [Website](https://lczero.org/)
- [GitHub](https://github.com/LeelaChessZero/lc0)

### Libraries & Tools

#### Chessground

Interactive chessboard rendered using [Chessground](https://github.com/lichess-org/chessground) from the Lichess team ([GPLv3](https://www.gnu.org/licenses/gpl-3.0.html) License).

#### Chessops

Core chess logic implemented using [Chessops](https://github.com/niklasf/chessops), a modern, modular library for move generation, legality checks, and FEN/PGN handling.

### Special Thanks

- **Lichess** - For the amazing API and open puzzle database
- **n8n.io** - For the flexible automation platform that forms the core of the backend
- **All contributors** and the chess community for their support and feedback

## 👨‍💻 About the Author

Hello! My name is **Moser**. I was born in 1985 in Kazakhstan and have been living in Germany since 2003.

By trade, I'm a mechanical engineer, but I've been passionate about chess my whole life. This project is a long-held dream of mine to create a convenient training tool, which became possible thanks to modern technologies like AI and the n8n platform.

I am fluent in Russian and German, and also know some English.

Thank you for using Chessboard.fun!

---

_Made with ❤️ for chess enthusiasts everywhere_
