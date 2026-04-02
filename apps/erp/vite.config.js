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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-router') || id.includes('@tanstack/react-query')) return 'router-data';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
        },
      },
    },
  },
  server: {
    port: 3060,
    proxy: {
      '/api': { target: 'http://localhost:5133', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5133', changeOrigin: true },
    },
  },
});
