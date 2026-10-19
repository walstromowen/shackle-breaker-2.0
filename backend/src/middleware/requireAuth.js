// backend/src/middleware/requireAuth.js: reads "Authorization: Bearer <token>" and puts { id, username } on req.user
import jwt from 'jsonwebtoken';

export function signToken(user, config) {
    return jwt.sign({ sub: user.id, u: user.username }, config.jwtSecret, { expiresIn: config.tokenLifetime });
}

export function requireAuth(config) {
    return (req, res, next) => {
        const header = req.get('authorization') || '';
        const match = /^Bearer (.+)$/.exec(header);
        if (!match) return res.status(401).json({ error: 'You are not logged in.' });
        try {
            const claims = jwt.verify(match[1], config.jwtSecret);
            req.user = { id: String(claims.sub), username: claims.u };
            next();
        } catch (e) {
            res.status(401).json({ error: 'Your login has expired. Please log in again.' });
        }
    };
}
