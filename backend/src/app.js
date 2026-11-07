// backend/src/app.js: builds the Express app. No listening or database connecting here (server.js does that), so tests can call it directly.
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { authRoutes } from './routes/auth.js';
import { saveRoutes } from './routes/saves.js';

/* The page's own address for the CSP (only the characters a host name and port can have) */
const hostOf = (req) => String(req.headers.host || 'localhost').replace(/[^A-Za-z0-9.:\-\[\]]/g, '');

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
                // 'self' covers the multiplayer WebSocket in current browsers; the ws(s):// form of this address is listed for older ones
                connectSrc: ["'self'", ...config.corsOrigins, (req) => `wss://${hostOf(req)}`, (req) => `ws://${hostOf(req)}`],
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
            // Every file is revalidated on each load (no-cache + ETag): an unchanged one costs a 304, and art or sound that was replaced
            // (a new portrait at the same path) shows on the next refresh instead of the browser's old copy for up to an hour.
            const staticOptions = {
                etag: true,
                setHeaders(res) {
                    res.setHeader('Cache-Control', 'no-cache');
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
