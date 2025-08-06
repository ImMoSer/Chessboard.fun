import { defineConfig, Plugin } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Получаем версию из package.json
const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const appVersion = packageJson.version;

// Определяем наш пользовательский плагин для добавления заголовков
const crossOriginHeadersPlugin: Plugin = {
  name: "configure-response-headers",

  configureServer(server) {
    server.middlewares.use((_req, res, next) => {
      // ИЗМЕНЕНО: 'require-corp' заменено на 'credentialless'
      res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      next();
    });
  },

  configurePreviewServer(server) {
    server.middlewares.use((_req, res, next) => {
      // ИЗМЕНЕНО: 'require-corp' заменено на 'credentialless'
      res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
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
    crossOriginHeadersPlugin,
  ],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion)
  },
  optimizeDeps: {
    exclude: ['@lichess-org/stockfish-web'],
  },
});
