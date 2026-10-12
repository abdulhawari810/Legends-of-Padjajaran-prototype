import { defineConfig } from 'vite';

// base './' WAJIB agar bisa dibungkus Capacitor (file:// / capacitor://)
// dan Tauri (tauri://). Jangan pakai '/' absolut.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    // Phaser ±1,2 MB memang melebihi 1500 kB — itu wajar, bukan masalah.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Pisahkan Phaser ke chunk sendiri: kode game kecil bisa di-parse
        // duluan, dan chunk Phaser di-cache terpisah antar versi build.
        manualChunks: { phaser: ['phaser'] }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
