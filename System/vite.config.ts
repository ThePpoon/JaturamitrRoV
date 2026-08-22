import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const HUB_PORT = process.env.HUB_PORT ?? '3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // host: true = ผูกทุก network interface เพื่อให้เปิดหน้าคุมจากแท็บเล็ตในวง LAN ได้
    host: true,
    proxy: {
      '/ws': { target: `ws://127.0.0.1:${HUB_PORT}`, ws: true },
      '/api': { target: `http://127.0.0.1:${HUB_PORT}` },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
