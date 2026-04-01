import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/** Dev: serve at http://localhost:5175/ so the app always loads (Vite + base /admin/ often breaks local /admin/). Prod build keeps base /admin/ for Nginx. */
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  return {
    plugins: [
      react(),
      isDev && {
        name: 'dev-redirect-legacy-admin-url',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const pathOnly = req.url?.split('?')[0] ?? '';
            if (pathOnly === '/admin' || pathOnly === '/admin/') {
              res.writeHead(302, { Location: '/' });
              res.end();
              return;
            }
            next();
          });
        },
      },
    ].filter(Boolean),
    base: isDev ? '/' : '/admin/',
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
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
      // Bind all interfaces (0.0.0.0) so http://localhost:5175 and http://127.0.0.1:5175 both work on Windows.
      // Error -102 / connection refused: dev not running, wrong port (see terminal), or firewall blocking Node.
      host: true,
      port: 5175,
      strictPort: false,
      https: false,
      proxy: {
        '/api': { target: 'http://127.0.0.1:5133', changeOrigin: true },
      },
    },
  };
});
