/**
 * PM2 ecosystem file for Cosmos ERP production.
 * Only the API runs under PM2. Admin, ERP, and Marketplace are built to
 * dist/ and served by Nginx (no PM2 process for them).
 *
 * Usage:
 *   cd /root/cosmoserp  # or your repo path
 *   pm2 start ecosystem.config.cjs
 *   pm2 restart cosmos-api
 *   pm2 save && pm2 startup
 */
module.exports = {
  apps: [
    {
      name: 'cosmos-api',
      cwd: './apps/api',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
