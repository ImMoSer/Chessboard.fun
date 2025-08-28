// vite.config.ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import VueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // <piece> - кастомный элемент
          isCustomElement: (tag) => tag.startsWith('piece'),
        },
      },
    }),

    viteStaticCopy({
      targets: [
        { src: 'public/stockfish_wasm/*', dest: 'stockfish_wasm' },
        { src: 'public/stockfish_single/*', dest: 'stockfish_single' },
      ],
    }),

    // 🔥 Включаем Vue Devtools
    VueDevTools(),
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
})
