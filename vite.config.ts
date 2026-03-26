// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import VueDevTools from 'vite-plugin-vue-devtools'
import { visualizer } from 'rollup-plugin-visualizer'
import pkg from './package.json'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => {
  return {
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    },
    plugins: [
      vue({
        template: {
          compilerOptions: {
            // <piece> - кастомный элемент
            isCustomElement: (tag) => tag.startsWith('piece'),
          },
        },
      }),

      AutoImport({
        imports: [
          'vue',
          {
            'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'],
          },
        ],
      }),
      Components({
        dirs: ['src/components', 'src/shared/ui'],
        resolvers: [NaiveUiResolver()],
      }),

      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/@lichess-org/stockfish-web/sf_18_smallnet.js',
            dest: 'stockfish/nnue',
          },
          {
            src: 'node_modules/@lichess-org/stockfish-web/sf_18_smallnet.wasm',
            dest: 'stockfish/nnue',
          },
          {
            src: 'node_modules/stockfish/bin/stockfish-18-lite-single.js',
            dest: 'stockfish/single',
          },
          {
            src: 'node_modules/stockfish/bin/stockfish-18-lite-single.wasm',
            dest: 'stockfish/single',
          },
          {
            src: 'node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm',
            dest: '',
          },
          {
            src: 'node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3-opfs-async-proxy.js',
            dest: '',
          },
          {
            src: 'node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3-worker1.mjs',
            dest: '',
          },
        ],
      }),

      ...(mode === 'development' ? [VueDevTools()] : []),
      visualizer({ open: false, filename: 'stats.html' }),
      
      // Auto-generate version.json for cache busting detection
      {
        name: 'generate-version-json',
        apply: 'build',
        closeBundle() {
          const versionPath = resolve(__dirname, 'dist/version.json');
          const data = { version: pkg.version, timestamp: Date.now() };
          writeFileSync(versionPath, JSON.stringify(data, null, 2));
        }
      }
    ],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'naive-ui': ['naive-ui'],
            'echarts': ['echarts', 'vue-echarts'],
            'chess-logic': ['@lichess-org/chessground', 'chessops'],
            'vendor': ['vue', 'vue-router', 'pinia', 'vue-i18n'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  }
})
