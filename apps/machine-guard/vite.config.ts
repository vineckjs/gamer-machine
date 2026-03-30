import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: { external: ['electron', 'bufferutil', 'utf-8-validate'] },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: { external: ['electron', 'bufferutil', 'utf-8-validate'] },
          },
        },
      },
    ]),
  ],
  server: {
    open: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@gamer-machine/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
