import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isAndroidBuild = process.env.VITE_ANDROID_BUILD === 'true';

export default defineConfig({
  plugins: [react()],
  base: isAndroidBuild ? './' : '/erp/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3060,
    proxy: {
      '/api': { target: 'http://localhost:5133', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5133', changeOrigin: true },
    },
  },
});
