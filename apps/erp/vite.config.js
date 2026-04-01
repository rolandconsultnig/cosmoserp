import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isAndroidBuild = process.env.VITE_ANDROID_BUILD === 'true';

/** Dev/preview: app is served under /erp/ (see main.jsx basename). Bare paths like /suppliers 404; redirect to /erp/... */
function erpBaseRedirectMiddleware() {
  return (req, res, next) => {
    const raw = req.url || '/';
    const pathname = raw.split('?')[0];
    const query = raw.includes('?') ? `?${raw.split('?').slice(1).join('?')}` : '';
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (pathname.startsWith('/erp')) return next();
    if (pathname.startsWith('/api') || pathname.startsWith('/uploads')) return next();
    if (pathname.startsWith('/@') || pathname.startsWith('/node_modules') || pathname.startsWith('/src')) return next();
    if (/\.[a-zA-Z0-9]{1,12}$/.test(pathname)) return next();
    const loc = pathname === '/' ? '/erp/' : `/erp${pathname}`;
    res.statusCode = 302;
    res.setHeader('Location', loc + query);
    res.end();
  };
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'erp-base-redirect',
      configureServer(server) {
        server.middlewares.use(erpBaseRedirectMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(erpBaseRedirectMiddleware());
      },
    },
  ],
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
