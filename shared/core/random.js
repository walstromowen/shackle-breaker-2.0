// shared/core/random.js: the dice the battle rules roll with.
//
// rng() is Math.random, except while a shared multiplayer fight is being played: then every player's browser rolls from the same seed
// (seedRandom), so the same choices give the same fight on every screen. Only the rules use it (hits, crits, damage spread, enemy
// choices, random targets, loot); what is only drawn (sparks, the scatter of damage numbers) keeps Math.random, so how many frames a
// screen draws can never move the dice.

let seeded = null;

/** A number in [0, 1): from the seeded stream while one is set, otherwise Math.random (looked up each call, so tests can stub it). */
export const rng = () => (seeded ? seeded() : Math.random());

/** From now on rng() gives the stream for `seed` (a 32-bit integer): mulberry32. */
export function seedRandom(seed) {
    let a = (Number(seed) >>> 0) || 1;
    seeded = () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    seeded.state = () => a;
    seeded.restore = (v) => { a = (Number(v) >>> 0); };
}

/** Where the seeded stream is now (a player let into a shared fight in progress starts from the same place), or null when unseeded. */
export const getRandomState = () => (seeded && seeded.state ? seeded.state() : null);

/** Puts the seeded stream at a place getRandomState gave (on another screen). */
export function setRandomState(v) { if (seeded && seeded.restore && Number.isFinite(v)) seeded.restore(v); }

/** Back to Math.random. */
export function unseedRandom() { seeded = null; }

export const isSeeded = () => seeded !== null;

/** Runs fn with Math.random in place of the seeded stream (something only one player's browser does), and returns its result. */
export function withoutSeed(fn) {
    const kept = seeded;
    seeded = null;
    try { return fn(); } finally { seeded = kept; }
}
