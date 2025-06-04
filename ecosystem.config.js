module.exports = {
    apps: [{
        name: 'assessment-app',
        script: './server/server.js',
        instances: 'max',
        exec_mode: 'cluster',
        autorestart: true,
        watch: false,
        max_memory_restart: '512M',
        env: {
            NODE_ENV: 'development',
            PORT: 3000
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000,
            LOG_LEVEL: 'info',
            ENABLE_CLUSTER: 'true'
        },
        log_type: 'json',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        error_file: './logs/pm2-error.log',
        out_file: './logs/pm2-out.log',
        log_file: './logs/pm2-combined.log',
        time: true,
        log_rotate: {
            max_size: '10M',
            retain: 7,
            compress: true,
            interval: '1d'
        },
        merge_logs: true,
        kill_timeout: 5000,
        listen_timeout: 8000,
        min_uptime: '10s',
        max_restarts: 10,
        health_check_grace_period: 3000,
        node_args: [
            '--max-old-space-size=512',
            '--optimize-for-size'
        ]
    },
    {
        name: 'assessment-app-dev',
        script: './server/server.js',
        instances: 1,
        exec_mode: 'fork',
        autorestart: true,
        watch: true,
        ignore_watch: [
            'node_modules',
            'logs',
            'data',
            '.git'
        ],
        max_memory_restart: '256M',
        env: {
            NODE_ENV: 'development',
            PORT: 3000,
            DEBUG_MODE: 'true'
        },
        error_file: './logs/dev-error.log',
        out_file: './logs/dev-out.log',
        log_file: './logs/dev-combined.log',
        time: true
    }
    ],
    deploy: {
        production: {
            user: 'ubuntu',
            host: ['your-server-ip'],
            ref: 'origin/main',
            repo: 'your-git-repository-url',
            path: '/home/ubuntu/outsourcingTEST',
            'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
            'pre-setup': 'sudo apt update && sudo apt install git -y'
        }
    }
}; 