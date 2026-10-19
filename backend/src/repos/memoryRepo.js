// backend/src/repos/memoryRepo.js
// Accounts and saves kept in memory. Used by the tests and by `npm run dev:memory` (STORAGE=memory): nothing survives a restart.
// It implements exactly the same interface as mongoRepo.js.
import crypto from 'node:crypto';

export function createMemoryRepo() {
    const users = new Map();      // id -> user
    const byLower = new Map();    // usernameLower -> id
    const saves = new Map();      // `${userId}:${slot}` -> record

    return {
        kind: 'memory',
        async connect() {},
        async close() {},

        users: {
            async create({ username, usernameLower, passwordHash }) {
                if (byLower.has(usernameLower)) { const e = new Error('duplicate'); e.code = 'DUPLICATE'; throw e; }
                const user = { id: crypto.randomUUID(), username, usernameLower, passwordHash, createdAt: new Date(), lastLoginAt: null };
                users.set(user.id, user);
                byLower.set(usernameLower, user.id);
                return { ...user };
            },
            async findByUsernameLower(usernameLower) {
                const id = byLower.get(usernameLower);
                return id ? { ...users.get(id) } : null;
            },
            async findById(id) {
                const user = users.get(String(id));
                return user ? { ...user } : null;
            },
            async touchLogin(id) {
                const user = users.get(String(id));
                if (user) user.lastLoginAt = new Date();
            }
        },

        saves: {
            async list(userId) {
                return [...saves.values()]
                    .filter(s => s.userId === String(userId))
                    .map(({ slot, summary, savedAt }) => ({ slot, summary, savedAt }))
                    .sort((a, b) => b.savedAt - a.savedAt);
            },
            async get(userId, slot) {
                const record = saves.get(`${userId}:${slot}`);
                return record ? { ...record } : null;
            },
            async put(userId, slot, { summary, savedAt, payload }) {
                saves.set(`${userId}:${slot}`, { userId: String(userId), slot, summary, savedAt, payload, updatedAt: new Date() });
            },
            async remove(userId, slot) {
                return saves.delete(`${userId}:${slot}`);
            },
            async count(userId) {
                return [...saves.values()].filter(s => s.userId === String(userId)).length;
            }
        }
    };
}
