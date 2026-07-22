import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    host: true, // Listens on 0.0.0.0
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000', // Explicit IPv4 to prevent ECONNREFUSED
        changeOrigin: true,
        secure: false,
      },
    },
  },
});