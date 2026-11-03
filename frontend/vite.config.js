import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_URL || './',
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        // Split heavy vendors so the first paint (HUD + boot screen) is not blocked by three.js.
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: { host: true, port: 5173 },
});
