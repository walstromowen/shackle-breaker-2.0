// backend/src/config.js: every setting comes from environment variables (see .env.example)
import crypto from 'node:crypto';

const bool = (value, fallback) => (value === undefined || value === '' ? fallback : !/^(false|0|no|off)$/i.test(String(value)));
const list = (value) => String(value || '').split(',').map(s => s.trim()).filter(Boolean);

export function loadConfig(env = process.env) {
    const production = env.NODE_ENV === 'production';

    let jwtSecret = env.JWT_SECRET;
    if (!jwtSecret || jwtSecret === 'change-me') {
        if (production) throw new Error('JWT_SECRET is not set. Set it to a long random string in the server environment.');
        jwtSecret = crypto.randomBytes(32).toString('hex');
        console.warn('[config] JWT_SECRET is not set: using a random one for this run (everyone is logged out when the server restarts).');
    }

    return {
        production,
        port: Number(env.PORT) || 3000,
        storage: (env.STORAGE || (process.argv.includes('--memory') ? 'memory' : 'mongo')).toLowerCase(),
        mongoUri: env.MONGODB_URI || '',
        jwtSecret,
        tokenLifetime: env.TOKEN_LIFETIME || '30d',
        inviteCode: env.INVITE_CODE || '',
        corsOrigins: list(env.CORS_ORIGIN),
        serveFrontend: bool(env.SERVE_FRONTEND, true),
        maxSavesPerUser: Number(env.MAX_SAVES_PER_USER) || 10,
        maxSaveBytes: Number(env.MAX_SAVE_BYTES) || 3 * 1024 * 1024
    };
}
