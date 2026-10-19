// backend/src/routes/saves.js
//   GET    /api/saves          -> { saves: [{ slot, summary, savedAt }] }
//   GET    /api/saves/:slot    -> { slot, savedAt, save }          404 if the slot is empty
//   PUT    /api/saves/:slot    body { save }  -> { slot, savedAt }   409 if the server already has a NEWER save (and ?force=1 was not sent)
//   DELETE /api/saves/:slot
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/requireAuth.js';
import { checkSlot, checkSave, cleanSummary, parseSavedAt } from '../util/validate.js';

export function saveRoutes({ repo, config }) {
    const router = Router();
    router.use(requireAuth(config));
    router.use(rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 600,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        keyGenerator: (req) => req.user.id,
        message: { error: 'Saving too often. Please slow down.' }
    }));

    router.get('/', async (req, res, next) => {
        try {
            res.json({ saves: await repo.saves.list(req.user.id) });
        } catch (e) { next(e); }
    });

    router.get('/:slot', async (req, res, next) => {
        try {
            const bad = checkSlot(req.params.slot);
            if (bad) return res.status(400).json({ error: bad });

            const record = await repo.saves.get(req.user.id, req.params.slot);
            if (!record) return res.status(404).json({ error: 'There is no save in that slot.' });
            res.json({ slot: record.slot, savedAt: record.savedAt, save: JSON.parse(record.payload) });
        } catch (e) { next(e); }
    });

    router.put('/:slot', async (req, res, next) => {
        try {
            const { slot } = req.params;
            const bad = checkSlot(slot) || checkSave(req.body && req.body.save);
            if (bad) return res.status(400).json({ error: bad });

            const save = req.body.save;
            const payload = JSON.stringify(save);
            if (Buffer.byteLength(payload, 'utf8') > config.maxSaveBytes) {
                return res.status(413).json({ error: 'That save is too large.' });
            }

            const savedAt = parseSavedAt(save.savedAt);
            const existing = await repo.saves.get(req.user.id, slot);

            if (existing) {
                // Never let an older copy (e.g. a device that was offline for a while) overwrite newer progress
                if (existing.savedAt > savedAt && req.query.force !== '1') {
                    return res.status(409).json({ error: 'The server has a newer save.', savedAt: existing.savedAt });
                }
            } else if (await repo.saves.count(req.user.id) >= config.maxSavesPerUser) {
                return res.status(400).json({ error: `You can keep at most ${config.maxSavesPerUser} save slots.` });
            }

            await repo.saves.put(req.user.id, slot, { summary: cleanSummary(save.summary), savedAt, payload });
            res.json({ slot, savedAt });
        } catch (e) { next(e); }
    });

    router.delete('/:slot', async (req, res, next) => {
        try {
            const bad = checkSlot(req.params.slot);
            if (bad) return res.status(400).json({ error: bad });
            res.json({ removed: await repo.saves.remove(req.user.id, req.params.slot) });
        } catch (e) { next(e); }
    });

    return router;
}
