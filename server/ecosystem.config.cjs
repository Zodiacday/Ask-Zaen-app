module.exports = {
  apps: [
    {
      name: 'calm-kids',
      script: 'build/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_PATH: './data/kids_media.db',
        CORS_ALLOWED_ORIGINS: 'https://www.askzaen.com,https://askzaen.com,http://localhost:8081,http://localhost:8083,http://localhost:5173'
      },
      max_memory_restart: '300M',
      restart_delay: 3000,
      autorestart: true
    }
  ]
};
