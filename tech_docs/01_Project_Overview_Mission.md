# 1. Project Overview & Mission

## Vision
The Chess App (Chessboard.fun) is a high-performance, professional-grade interactive platform designed for chess enthusiasts who seek more than just casual play. Our mission is to provide advanced training environments that bridge the gap between amateur play and grandmaster-level preparation.

We focus on:
- **Depth over Simplicity**: Providing detailed, engine-backed analysis and unique training modes.
- **Human-centric AI**: Leveraging models like Maia to simulate realistic human-like opponents and error patterns.
- **Theory Integration**: Seamlessly connecting training sessions with opening repertoires and endgame theory.

## Project Ecosystem
The application is built as a distributed system, ensuring scalability and specialized handling of heavy chess computations.

### Components At a Glance:
- **Frontend ([chess_frontend](file:///C:/CHESS_APP/chess_frontend))**: Our public flagship. Built with Vue.js 3 and TypeScript, it offers a modern, responsive interface for all training modes. It is Open Source, representing our commitment to the community.
- **Backend ([chess_server](file:///C:/CHESS_APP/chess_server))**: The brain of the operation. A FastAPI (Python) service that coordinates engine tasks, manages user sessions, and interacts with the database.
- **Engine Layer ([chess-engines](file:///C:/CHESS_APP/chess-engines))**: A specialized containerized environment hosting Stockfish, multiple Maia weights, and our proprietary classification engines.
- **Theory & Books ([chess-theory](file:///C:/CHESS_APP/chess-theory))**: Home to `MozerBook`, our extensive opening theory database and repertoire management system.
- **Remote Commentator (`brilliant_move`)**: An external Python-based intelligence module providing real-time sparring commentary and deep positional insights.

## Open Source Policy
To promote transparency and collective improvement, the **Frontend** component of this project is public. While the backend and engine orchestration remain private to protect proprietary training methodologies and infrastructure security, we expose the architectural interfaces as detailed in this documentation for marketing and technical review purposes.

---
*Next Chapter: [Technical Stack](./02_Technical_Stack.md)*
