import { defineConfig, Plugin } from 'vite';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
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

// ДОБАВЛЕНО: Плагин для генерации .htaccess файла
const generateHtaccessPlugin = (): Plugin => {
  return {
    name: 'vite-plugin-generate-htaccess',
    // Этот хук вызывается после завершения сборки
    closeBundle: () => {
      const htaccessContent = `
# BEGIN REQUIRED HEADERS FOR SHAREDARRAYBUFFER
# These headers are necessary for multi-threaded WebAssembly (Stockfish NNUE) to work.
# They create a cross-origin isolated context.
<IfModule mod_headers.c>
  Header set Cross-Origin-Opener-Policy "same-origin"
  Header set Cross-Origin-Embedder-Policy "credentialless"
</IfModule>
# END REQUIRED HEADERS

# Anweisung zum Setzen des korrekten MIME-Typs für .wasm-Dateien
# Vorgeschlagen vom Hostinger-Support
<IfModule mod_mime.c>
  AddType application/wasm .wasm
</IfModule>
`.trim();

      try {
        const distPath = resolve(__dirname, 'dist');
        if (!existsSync(distPath)) {
          mkdirSync(distPath, { recursive: true });
        }
        writeFileSync(resolve(distPath, '.htaccess'), htaccessContent);
        console.log('\x1b[32m%s\x1b[0m', '✓ .htaccess file generated successfully!');
      } catch (e) {
        console.error('\x1b[31m%s\x1b[0m', `Error generating .htaccess file: ${e}`);
      }
    }
  };
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
    generateHtaccessPlugin(), // ДОБАВЛЕНО: Вызываем плагин
  ],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion)
  },
  optimizeDeps: {
    exclude: ['@lichess-org/stockfish-web'],
  },
});
