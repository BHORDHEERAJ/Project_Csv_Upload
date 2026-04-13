// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'laravel-server',
    script: 'artisan',
    args: ['serve', '--port=8001'],
    interpreter: 'php',
    instances: 1,
    env: {
      NODE_ENV: 'production'
    }
  }, {
    name: 'node-processor',
    script: 'server.js',
    cwd: './tipic-node',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }, {
    name: 'vite-frontend',
    script: 'npm',
    args: 'run dev',
    instances: 1,
    env: {
      NODE_ENV: 'development'
    }
  }]
};
