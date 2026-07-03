// =============================================================================
// FacilityPro — PM2 Ecosystem Configuration
// =============================================================================
// Alternative to Docker. Use when you prefer running directly on the VPS.
// Install:  npm install -g pm2
// Start:    pm2 start deploy/pm2/ecosystem.config.cjs
// Save:     pm2 save
// Restore:  pm2 resurrect
// Logs:     pm2 logs
// Monitor:  pm2 monit
// =============================================================================

module.exports = {
  apps: [
    // ── Main Next.js Application ──────────────────────────────────────────
    {
      name: 'facilitypro',
      script: 'server.js',
      cwd: '/opt/facilitypro/app/.next/standalone',
      instances: 1,         // SQLite: single instance only
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        DATABASE_URL: 'file:/opt/facilitypro/db/custom.db',
        STORAGE_ROOT: '/opt/facilitypro/storage',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/facilitypro/logs/app-error.log',
      out_file: '/opt/facilitypro/logs/app-out.log',
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },

    // ── WhatsApp Mini-Service (Optional) ──────────────────────────────────
    // Uncomment to run the WhatsApp service alongside the main app.
    // Requires: Chromium, Xvfb, and system dependencies installed.
    // {
    //   name: 'whatsapp-service',
    //   script: 'index.ts',
    //   cwd: '/opt/facilitypro/app/mini-services/whatsapp-service',
    //   interpreter: 'bun',
    //   instances: 1,
    //   exec_mode: 'fork',
    //   env: {
    //     NODE_ENV: 'production',
    //     PORT: 3003,
    //     DISPLAY: ':99',
    //     CHROME_PATH: '/usr/bin/chromium',
    //   },
    //   log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    //   error_file: '/opt/facilitypro/logs/whatsapp-error.log',
    //   out_file: '/opt/facilitypro/logs/whatsapp-out.log',
    //   max_memory_restart: '2G',
    //   autorestart: true,
    //   watch: false,
    //   kill_timeout: 10000,
    // },
  ],
};