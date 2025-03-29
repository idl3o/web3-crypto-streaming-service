module.exports = {
    apps: [{
        name: 'web3-crypto-stream',
        script: './dist/machine-runner.js',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'development'
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000
        }
    }],
    deploy: {
        production: {
            user: 'SSH_USERNAME',
            host: 'SSH_HOSTMACHINE',
            ref: 'origin/main',
            repo: 'git@github.com:username/web3-crypto-streaming-service.git',
            path: '/var/www/production',
            'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
        }
    }
}
