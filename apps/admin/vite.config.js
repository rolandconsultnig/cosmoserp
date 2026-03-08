import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5175,
    https: true, // avoids browser "password on insecure (http) page" warning
    proxy: {
      '/api': { target: 'http://localhost:5133', changeOrigin: true },
    },
  },
});
