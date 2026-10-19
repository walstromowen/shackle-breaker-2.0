// backend/src/util/validate.js: input checks shared by the routes. Every function returns an error string, or null when the input is fine.

export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
export const SLOT_RE = /^[a-z0-9_-]{1,32}$/;
export const SAVE_FORMAT = 'shackle-breaker-save';

export function checkUsername(username) {
    if (typeof username !== 'string') return 'Enter a username.';
    if (!USERNAME_RE.test(username)) return 'Usernames are 3-20 characters: letters, numbers and underscores.';
    return null;
}

export function checkPassword(password) {
    if (typeof password !== 'string') return 'Enter a password.';
    if (password.length < 8) return 'Passwords need at least 8 characters.';
    // bcrypt only reads the first 72 bytes, so a longer password would silently be cut: refuse it instead
    if (Buffer.byteLength(password, 'utf8') > 72) return 'Passwords can be at most 72 characters.';
    return null;
}

export function checkSlot(slot) {
    if (typeof slot !== 'string' || !SLOT_RE.test(slot)) return 'Invalid save slot name.';
    return null;
}

/** The server never needs to understand a save, only to make sure it is one and that it is not absurd. */
export function checkSave(save) {
    if (!save || typeof save !== 'object' || Array.isArray(save)) return 'The save is missing.';
    if (save.format !== SAVE_FORMAT) return 'This is not a Shackle-breaker save.';
    if (!Number.isInteger(save.saveVersion) || save.saveVersion < 1 || save.saveVersion > 10000) return 'The save has no valid version.';
    if (!save.data || typeof save.data !== 'object' || Array.isArray(save.data)) return 'The save has no data.';
    return null;
}

/** A short, safe description of a save for slot lists (never trusts the client's summary blindly). */
export function cleanSummary(summary) {
    const s = summary && typeof summary === 'object' ? summary : {};
    const num = (v) => (Number.isFinite(v) ? v : null);
    return {
        name: typeof s.name === 'string' ? s.name.slice(0, 40) : '',
        level: num(s.level),
        partySize: num(s.partySize),
        day: num(s.day),
        difficulty: typeof s.difficulty === 'string' ? s.difficulty.slice(0, 20) : ''
    };
}

export function parseSavedAt(value) {
    const t = typeof value === 'string' ? Date.parse(value) : NaN;
    return Number.isFinite(t) ? new Date(t) : new Date();
}
