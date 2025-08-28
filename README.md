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

| Bot       | Rating | Engine          | Configuration              |
| --------- | ------ | --------------- | -------------------------- |
| Rbleipzig | 2200+  | Stockfish.js    | depth 12, contempt 100     |
| Krokodil  | 2100+  | Stockfish.js    | depth 10, contempt 100     |
| Karde     | 2000+  | Stockfish.js    | depth 8, contempt 100      |
| MoZeR     | 1900+  | LCZero+Maia1900 | Human-like engine (server) |
| Dimas     | 1800+  | Stockfish.js    | depth 6, contempt 100      |
| Darko     | 1700+  | Stockfish.js    | depth 4, contempt 100      |

## 🛠️ Tech Stack

- **Frontend**: TypeScript, Vue.js
- **Backend**: n8n.io + Nest.js
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

## 📄 License & Acknowledgements

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

### Third-Party Components

#### Stockfish Chess Engine

Game and move analysis powered by [Stockfish](https://stockfishchess.org/), an open-source chess engine distributed under GPLv3.

> **Important**: Due to GPLv3 requirements, our source code is available under the same license.

#### Chessground

Interactive chessboard rendered using [Chessground](https://github.com/lichess-org/chessground) from the Lichess team (MIT License).

### Special Thanks

- **Stockfish Team** - For the incredible chess engine
- **Lichess** - For the amazing API and Chessground library
- **n8n** - For the flexible automation platform
- **Chess Community** - For continuous support and feedback

## 🤝 Contributing

We welcome all contributions! If you have ideas, suggestions, or found a bug:

1. Create an [issue](../../issues) to discuss your idea
2. Fork the repository
3. Create your feature branch
4. Submit a [pull request](../../pulls)

---

**Ready to improve your chess skills?** Visit [Chessboard.fun](https://chessboard.fun) and start training!
