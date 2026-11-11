// backend/src/app.js: builds the Express app. No listening or database connecting here (server.js does that), so tests can call it directly.
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { authRoutes } from './routes/auth.js';
import { saveRoutes } from './routes/saves.js';

/* The page's own address for the CSP (only the characters a host name and port can have) */
const hostOf = (req) => String(req.headers.host || 'localhost').replace(/[^A-Za-z0-9.:\-\[\]]/g, '');

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// A file's ETag from its contents, hashed once and kept until the file's size or modified time changes (a file replaced
// while the server runs is hashed again). Unchanged bytes give the same tag on every server and after every deploy.
const etagCache = new Map();
export function contentEtag(filePath, stat) {
    const cached = etagCache.get(filePath);
    if (cached && cached.size === stat.size && cached.mtimeMs === stat.mtimeMs) return cached.etag;
    const hash = crypto.createHash('sha1').update(fs.readFileSync(filePath)).digest('base64url');
    const etag = `"${stat.size.toString(16)}-${hash}"`;
    etagCache.set(filePath, { size: stat.size, mtimeMs: stat.mtimeMs, etag });
    return etag;
}

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
            // The ETag is a hash of the file's bytes, not express's default of size + modified time: every deploy checks the repo out
            // afresh, so every file's modified time changes and the default tags made each player download the whole game again
            // (~130 MB) after each push. Last-Modified is off for the same reason (a newer date would also count as changed).
            const staticOptions = {
                etag: false,
                lastModified: false,
                setHeaders(res, filePath, stat) {
                    res.setHeader('Cache-Control', 'no-cache');
                    res.setHeader('ETag', contentEtag(filePath, stat));
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
