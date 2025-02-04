module.exports = {
  apps: [
    {
      name: 'memory-sync',
      script: 'cronjobs/memory-sync.js',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
