// backend/src/app.js: builds the Express app. No listening or database connecting here (server.js does that), so tests can call it directly.
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { authRoutes } from './routes/auth.js';
import { saveRoutes } from './routes/saves.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function createApp({ repo, config }) {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);   // behind Render's proxy: req.ip is the visitor, not the proxy (the rate limits depend on it)

    app.use(helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'blob:'],
                mediaSrc: ["'self'", 'blob:'],
                fontSrc: ["'self'", 'data:'],
                connectSrc: ["'self'", ...config.corsOrigins],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"]
            }
        },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginOpenerPolicy: false
    }));

    // The game page is normally served by this same server (no CORS needed). CORS only matters if it is hosted elsewhere, or opened from a
    // dev server on another port (VS Code Live Server...): any localhost origin is accepted outside production.
    app.use('/api', cors({
        origin(origin, callback) {
            if (!origin) return callback(null, true);
            if (config.corsOrigins.includes(origin)) return callback(null, true);
            if (!config.production && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
            callback(null, false);
        },
        allowedHeaders: ['Content-Type', 'Authorization'],
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }));

    app.use(express.json({ limit: '4mb' }));

    app.get('/api/health', (req, res) => res.json({ ok: true, storage: repo.kind, inviteRequired: !!config.inviteCode }));
    app.use('/api/auth', authRoutes({ repo, config }));
    app.use('/api/saves', saveRoutes({ repo, config }));
    app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

    if (config.serveFrontend) {
        const frontendSrc = path.join(REPO_ROOT, 'frontend', 'src');
        const sharedDir = path.join(REPO_ROOT, 'shared');
        if (fs.existsSync(frontendSrc) && fs.existsSync(sharedDir)) {
            // Code files are always revalidated (testers get a new build on refresh); art and sound can be cached for a while.
            const staticOptions = {
                etag: true,
                setHeaders(res, filePath) {
                    const code = /\.(js|mjs|html|css|json)$/i.test(filePath);
                    res.setHeader('Cache-Control', code ? 'no-cache' : 'public, max-age=3600');
                }
            };
            // The same layout a dev server (Live Server...) gives when it is started in the repo root: the code climbs between
            // /frontend/src and /shared with relative imports ("../../shared/core/eventBus.js"), so both must sit under one root.
            // Only these two folders are public: backend/, tools/, .env and the rest of the repo are not reachable.
            app.use('/shared', express.static(sharedDir, staticOptions));
            app.use('/frontend/src', express.static(frontendSrc, staticOptions));
            app.get('/', (req, res) => res.redirect('/frontend/src/index.html'));
        } else {
            console.warn('[server] frontend/src or shared/ not found: only the API is served.');
        }
    }

    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'That request is too large.' });
        if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request was not valid JSON.' });
        console.error('[server] Unhandled error:', err);
        res.status(500).json({ error: 'Something went wrong on the server.' });
    });

    return app;
}
