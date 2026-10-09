import { defineConfig } from 'vite';

// base './' WAJIB agar bisa dibungkus Capacitor (file:// / capacitor://)
// dan Tauri (tauri://). Jangan pakai '/' absolut.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    chunkSizeWarningLimit: 1500 // phaser besar, wajar
  },
  server: {
    port: 5173,
    host: true
  }
});
