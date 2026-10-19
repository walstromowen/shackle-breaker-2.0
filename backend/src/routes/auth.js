// backend/src/routes/auth.js: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { signToken, requireAuth } from '../middleware/requireAuth.js';
import { checkUsername, checkPassword } from '../util/validate.js';

const BCRYPT_COST = 11;
// A real hash of nothing in particular, so a login for a name that does not exist costs the same time as one that does (no user-guessing by timing)
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

const safeEqual = (a, b) => {
    const x = Buffer.from(String(a)), y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function authRoutes({ repo, config }) {
    const router = Router();

    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 30,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: 'Too many attempts. Please wait a few minutes and try again.' }
    });

    router.post('/register', limiter, async (req, res, next) => {
        try {
            const { username, password, inviteCode } = req.body || {};

            const problem = checkUsername(username) || checkPassword(password);
            if (problem) return res.status(400).json({ error: problem });

            if (config.inviteCode && !(typeof inviteCode === 'string' && safeEqual(inviteCode.trim(), config.inviteCode))) {
                return res.status(403).json({ error: 'That invite code is not right.' });
            }

            const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
            let user;
            try {
                user = await repo.users.create({ username, usernameLower: username.toLowerCase(), passwordHash });
            } catch (e) {
                if (e.code === 'DUPLICATE') return res.status(409).json({ error: 'That username is already taken.' });
                throw e;
            }
            res.status(201).json({ token: signToken(user, config), user: { id: user.id, username: user.username } });
        } catch (e) { next(e); }
    });

    router.post('/login', limiter, async (req, res, next) => {
        try {
            const { username, password } = req.body || {};
            if (typeof username !== 'string' || typeof password !== 'string') {
                return res.status(400).json({ error: 'Enter your username and password.' });
            }
            const user = await repo.users.findByUsernameLower(username.toLowerCase());
            const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
            if (!user || !ok) return res.status(401).json({ error: 'Wrong username or password.' });

            repo.users.touchLogin(user.id).catch(() => {});
            res.json({ token: signToken(user, config), user: { id: user.id, username: user.username } });
        } catch (e) { next(e); }
    });

    router.get('/me', requireAuth(config), async (req, res, next) => {
        try {
            const user = await repo.users.findById(req.user.id);
            if (!user) return res.status(401).json({ error: 'This account no longer exists.' });
            res.json({ user: { id: user.id, username: user.username } });
        } catch (e) { next(e); }
    });

    return router;
}
