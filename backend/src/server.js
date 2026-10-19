// backend/src/server.js: `npm start` (from the repo root or from backend/). Reads settings from the environment / backend/.env (see .env.example).
import 'dotenv/config';
import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { createMemoryRepo } from './repos/memoryRepo.js';
import { createMongoRepo } from './repos/mongoRepo.js';

async function main() {
    const config = loadConfig();

    const repo = config.storage === 'memory' ? createMemoryRepo() : createMongoRepo(config.mongoUri);
    if (repo.kind === 'memory') console.warn('[server] STORAGE=memory: accounts and saves are NOT kept when the server stops.');
    await repo.connect();
    console.log(`[server] Storage ready (${repo.kind}).`);

    const app = createApp({ repo, config });
    const server = app.listen(config.port, () => {
        console.log(`[server] Listening on http://localhost:${config.port}${config.serveFrontend ? '  (the game is served at /)' : ''}`);
        if (config.inviteCode) console.log('[server] Sign-up needs the invite code.');
    });

    const shutdown = (signal) => {
        console.log(`[server] ${signal}: shutting down.`);
        server.close(() => repo.close().finally(() => process.exit(0)));
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
});
