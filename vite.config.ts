// vite.config.js
import { defineConfig, Plugin } from 'vite';
// import { viteStaticCopy } from 'vite-plugin-static-copy'; // Эту строку удалить

// Определяем наш пользовательский плагин для добавления заголовков
const crossOriginHeadersPlugin = { //
  name: "configure-response-headers",

  configureServer(server) { //
    server.middlewares.use((_req, res, next) => {
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp"); //
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin"); //
      next();
    });
  },

  configurePreviewServer(server) { //
    server.middlewares.use((_req, res, next) => {
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp"); //
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin"); //
      next();
    });
  }
};

export default defineConfig({
  build: {
    sourcemap: true,
  },
  server: {
    cors: true,
  },
  preview: {
    // cors: true, // Возможно, потребуется также включить CORS для preview
  },
  plugins: [
    crossOriginHeadersPlugin, // Наш плагин для COOP/COEP заголовков остается
    // УДАЛЕНО ЗДЕСЬ: Плагин viteStaticCopy больше не используется, так как файлы уже в public/
  ],
  optimizeDeps: {
    // optimizeDeps.exclude предотвращает предварительную сборку Vite для этого модуля,
    // что важно для правильной работы Emscripten-генерированных JS-файлов.
    exclude: ['@lichess-org/stockfish-web'],
  },
});