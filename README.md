# Chessboard.fun

**Chessboard.fun** is an interactive web platform for chess enthusiasts, offering unique training modes, detailed statistics, and powerful analysis tools.

## 🚀 Main Modes

- **Conversion**: A unique mode where you first solve a tactical puzzle and then must prove your advantage in the endgame by playing against the Stockfish engine.
- **SpeedRun**: Test your speed and accuracy by solving a series of timed tactical puzzles of varying difficulty, from CM to Grandmaster level.
- **Club Statistics**: View detailed statistics and leaderboards for any Lichess chess club, tracking player activity and achievements.
- **User Cabinet**: A personal dashboard with your statistics in the "Conversion" and "SpeedRun" modes, a list of your favorite puzzles, and your Lichess activity.
- **Analysis Panel**: A powerful tool for analyzing any position with the Stockfish engine, viewing variations, and PGN.

## ✨ Key Features

- **Lichess Integration**: Log in via your Lichess account, use your profile, and fetch club activity data.
- **Advanced Statistics**: Track your tactical and conversion ratings, number of games played, FunCoins, and more.
- **Lichess Puzzle Database**: All puzzles in the application are based on the vast and high-quality Lichess puzzle database: https://database.lichess.org/#puzzles.
- **Modern UI**: A clean, responsive, and intuitive interface built with TypeScript and Snabbdom.
- **Localization**: Support for both English and Russian languages.

## 🛠️ Tech Stack

- **Frontend**: TypeScript, Snabbdom.js
- **Backend**: n8n.io (for webhook processing and game logic)
- **Chess Logic**: `chessops`
- **Board Rendering**: `Chessground`
- **Chess Engine**: `Stockfish.wasm`
- **API**: Lichess API (https://lichess.org/api) for fetching user and club data.

## 📜 Licensing and Acknowledgements

This project is made possible by the use of open-source libraries.

### Stockfish Chess Engine

Game and move analysis in this application is powered by **Stockfish**, an open-source chess engine distributed under the **GNU General Public License v3 (GPLv3)**.

**Important Note on the GPLv3 License:** The use of a library under the GPLv3 license requires us to make the source code of our own project open and available under the same or a compatible license.

- **Project Source Code**: Available in this repository
- **License Text**: You can read the full text of the GPLv3 license here: https://www.gnu.org/licenses/gpl-3.0.html.

We extend our deepest gratitude to the Stockfish team for their incredible work.

### Chessground

The interactive chessboard is rendered using the **Chessground** library from the Lichess team, which is distributed under the **MIT License**. Thank you to Lichess for this wonderful tool.

## 🤝 Contributing

We welcome all contributions to the project! If you have ideas, suggestions, or have found a bug, please create an `issue` or a `pull request`.

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Stockfish](https://stockfishchess.org/) - The powerful chess engine
- [Lichess](https://lichess.org/) - For the amazing API and Chessground library
- [n8n](https://n8n.io/) - For the flexible automation platform
- All contributors and the chess community

---

Made with ❤️ for chess enthusiasts everywhere
