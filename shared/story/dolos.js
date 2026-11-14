/* Dolos: the hidden hand behind the world's cruelty, and the game's director (like a RimWorld storyteller).

   He watches the party and paces the game. He never takes power from a character; he changes the world around them: how often the party is
   ambushed, how strong and how many its enemies are, how much they leave behind, and how likely the fights and encounters are to leave a mark
   (a trait, good or bad). He sits on top of the difficulty the player chose, and the difficulty sets his temperament.

   The cycle (PHASES): respite -> calm -> stirring -> gaze -> respite ...
     respite    he has looked away: fewer ambushes, weaker foes, more loot, good traits come easier and bad ones harder
     calm       nothing in particular
     stirring   his attention gathers: more ambushes, now and then one more foe, bad traits come easier
     gaze       he is watching: many ambushes, stronger and more foes, more spoils for those who live, bad traits come easiest
   Tension builds with the hours (twice as fast under a blood moon, when he is felt most) and with easy victories, and falls with hard ones.
   It climbs from calm to stirring to gaze; a gaze lasts its hours or its fights, then he looks away (respite), and a respite lasts its hours.
   A defeat ends any gaze at once: he lets the party up off the floor, for now.

   He reads how far ahead of the curve the party is (edge, -1..1): its weapons against the levels they are usually upgraded by (the same
   schedule as tools/playthroughSim.mjs), and how its last fights went. A party that is ahead is watched sooner and harder, with fewer gifts;
   a party that is behind gets longer rests.

   His state is the world's (gameState.world.changes.dolos): saved with it, sent to the other players, and moved on only by the world's owner
   (worldSync.ownsWorld); the others play by it. He is not named while the story keeps him hidden (the world flag story:dolos_named, which the
   story will set when he is revealed): the signs of his attention are shown as nameless omens (`DOLOS_SIGN`, shown on the overworld). */
import { gameState } from '../core/gameState.js';
import { worldSync } from '../core/worldSync.js';
import { events } from '../core/eventBus.js';
import { StatCalculator } from '../characters/statCalculator.js';

export const PHASES = ['respite', 'calm', 'stirring', 'gaze'];

/* What each phase does. ambushRate: times the chance of an ambush; enemyLevel: added to non-boss enemies; extraEnemyChance: chance of one more
   ambusher (one over the usual most, never more); lootBonusChance: chance of one more roll of an enemy's or an encounter's loot; goodTrait /
   badTrait: times the chance of gaining such a trait in a fight or an encounter. */
export const PHASE_EFFECTS = {
    respite:  { ambushRate: 0.5,  enemyLevel: -1, extraEnemyChance: 0,    lootBonusChance: 0.3,  goodTrait: 1.5, badTrait: 0.5 },
    calm:     { ambushRate: 1,    enemyLevel: 0,  extraEnemyChance: 0,    lootBonusChance: 0,    goodTrait: 1,   badTrait: 1 },
    stirring: { ambushRate: 1.3,  enemyLevel: 0,  extraEnemyChance: 0.25, lootBonusChance: 0,    goodTrait: 1,   badTrait: 1.25 },
    gaze:     { ambushRate: 1.75, enemyLevel: 1,  extraEnemyChance: 0.5,  lootBonusChance: 0.35, goodTrait: 0.75, badTrait: 1.75 }
};

/* His temperament, from the difficulty: how fast tension builds (per in-game hour), and how long a gaze and a respite last (hours, and a gaze's
   fights). Easy: long rests and short gazes. Nightmare: rests are brief and the gaze lingers. */
export const TEMPERAMENTS = {
    easy:      { tensionPerHour: 1.5, gazeHours: 4,  gazeFights: 2, respiteHours: 18 },
    normal:    { tensionPerHour: 2.5, gazeHours: 6,  gazeFights: 3, respiteHours: 12 },
    hard:      { tensionPerHour: 3.5, gazeHours: 8,  gazeFights: 4, respiteHours: 8 },
    nightmare: { tensionPerHour: 5,   gazeHours: 10, gazeFights: 5, respiteHours: 5 }
};
export const THRESHOLDS = { stirring: 50, gaze: 100 };

/* His counters: the enemies he sends are readied against the party he has been watching (counter()). The chance an enemy is readied, by phase,
   is COUNTER_CHANCE[phase] x (edge + 0.25): never in his respite, now and then while calm, often in his gaze, and most against a party that is
   far ahead. A readied enemy gets the trait that blunts the party's main kind of damage, armour against it (a humanoid that can wear it), and its
   weapon forged up to the party's own weapon level (up to one below outside his gaze). A party far ahead (edge > 0.5) also meets Tough foes. */
export const COUNTER_CHANCE = { respite: 0, calm: 0.15, stirring: 0.35, gaze: 0.6 };
const PHYSICAL = ['blunt', 'slash', 'pierce'];
/* the trait that blunts each kind of damage, and the armour against it */
export const COUNTERS = {
    physical: { trait: 'ironhide', armor: ['iron_armor', 'iron_helmet'] },
    fire:     { trait: 'pyromaniac', armor: ['cloth_robe', 'cloth_hood'] },
    dark:     { trait: 'nocturnal', armor: ['cloth_robe', 'cloth_hood'] },
    magic:    { trait: 'tough', armor: ['cloth_robe', 'cloth_hood'] }
};
const MEMORY = 6;
export const GRACE_LEVEL = 5;                     // he takes no notice of a party below this level: the opening hours are the player's own                                 // the fights he remembers when he weighs the party
const WEAPON_DUE = [1, 4, 9, 15, 22];            // the levels a weapon is usually upgraded by (tools/playthroughSim.mjs): the curve he holds the party to
const KEY = 'dolos';

/* The omens of his attention. Nameless while he is hidden; once the story names him, he is named. */
const SIGNS = {
    stirring: ["The wind turns, and for a moment it smells of iron. Something far off has turned its head.", "Dolos turns his head toward you."],
    gaze:     ["The iron at your wrists goes cold. You are being watched.", "Dolos is watching you."],
    respite:  ["The weight lifts from your shoulders. Whatever was watching has looked away. For now.", "Dolos looks away. For now."],
    calm:     ["The world settles back into its old indifference.", "The world settles. Dolos waits."]
};

const fresh = (now) => ({ phase: 'calm', tension: 0, since: now, last: now, fights: [], gazeFights: 0 });
const nowOf = (state) => (state.world && typeof state.world.time === 'number' ? state.world.time : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const Dolos = {
    /** His state in this world (made the first time it is asked for). */
    state(state = gameState) {
        const changes = state.world.changes || (state.world.changes = {});
        if (!changes[KEY] || typeof changes[KEY] !== 'object') changes[KEY] = fresh(nowOf(state));
        return changes[KEY];
    },

    temperament(state = gameState) {
        return TEMPERAMENTS[state.difficulty] || TEMPERAMENTS.normal;
    },

    /** Whether he has noticed the party yet: not until its strongest member reaches GRACE_LEVEL. */
    noticed(state = gameState) {
        const members = (state.party && state.party.members || []).filter(Boolean);
        return !members.length || members.some(m => (m.level || 1) >= GRACE_LEVEL);
    },

    named(state = gameState) {
        return !!(state.world.changes && state.world.changes['story:dolos_named']);
    },

    /** How far ahead of the curve the party is, -1 (struggling) .. 1 (far too strong): its weapons against their level, and its last fights. */
    edge(state = gameState) {
        const members = (state.party && state.party.members || []).filter(Boolean);
        let gear = 0, n = 0;
        for (const m of members) {
            const eq = m.equipment || (m.state && m.state.equipment) || {};
            const w = eq.mainHand || eq.twoHand;
            if (!w || typeof w !== 'object') continue;
            const expected = WEAPON_DUE.filter(l => (m.level || 1) >= l).length;
            gear += clamp((w.level || 1) - expected, -2, 2) / 2;
            n++;
        }
        gear = n ? gear / n : 0;
        const fights = this.state(state).fights || [];
        const perf = fights.length ? fights.reduce((s, f) => s + f, 0) / fights.length : 0;
        return clamp(0.4 * gear + 0.6 * perf, -1, 1);
    },

    /** What he has learned of the party: the damage it relies on (each member's strongest attack, weighed by how strong it is; every character
     *  has some of every kind, so the sum would say nothing), whether that is mostly physical, and its weapons' and armour's levels on average. */
    profile(state = gameState) {
        const members = (state.party && state.party.members || []).filter(Boolean);
        const attack = {};
        let weapons = 0, wn = 0, armor = 0, an = 0;
        for (const m of members) {
            let st = null;
            try { st = StatCalculator.calculate(m); } catch (e) { st = null; }
            const best = Object.entries((st && st.attack) || {}).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0];
            if (best) attack[best[0]] = (attack[best[0]] || 0) + (best[1] || 0);
            const eq = m.equipment || (m.state && m.state.equipment) || {};
            const w = eq.mainHand || eq.twoHand;
            if (w && typeof w === 'object') { weapons += w.level || 1; wn++; }
            if (eq.torso && typeof eq.torso === 'object') { armor += eq.torso.level || 1; an++; }
        }
        const total = Object.values(attack).reduce((s, v) => s + v, 0) || 1;
        const physical = PHYSICAL.reduce((s, k) => s + (attack[k] || 0), 0) / total;
        const magic = Object.entries(attack).filter(([k]) => !PHYSICAL.includes(k)).sort((a, b) => b[1] - a[1])[0];
        const kind = physical >= 0.5 ? 'physical' : (magic && (magic[0] === 'fire' || magic[0] === 'dark') ? magic[0] : 'magic');
        return { kind, physical, attack, weaponLevel: wn ? Math.round(weapons / wn) : 1, armorLevel: an ? Math.round(armor / an) : 1 };
    },

    /**
     * Readies one enemy against the party, now and then (COUNTER_CHANCE, by phase and edge): the trait that blunts its main damage, armour against
     * it, a weapon forged to the party's level. Never a boss or a boss's limb. `makeItem(defId, level)` builds an item (the scene manager's).
     * @returns {{ countered: boolean, trait: string|null, weapon: number, armor: string[] }}
     */
    counter(entity, { rand = Math.random, makeItem = null, bossOrLimb = false } = {}, state = gameState, bloodMoon = false) {
        const done = { countered: false, trait: null, weapon: 0, armor: [] };
        const st = entity && (entity.state || entity);
        if (!st || bossOrLimb || (st.tags || []).includes('BOSS')) return done;
        const phase = this.effects(state, bloodMoon).phase;
        const edge = this.edge(state);
        const chance = (COUNTER_CHANCE[phase] || 0) * Math.max(0, edge + 0.25);
        if (!(chance > 0) || rand() >= chance) return done;
        done.countered = true;
        const p = this.profile(state);
        const c = COUNTERS[p.kind] || COUNTERS.physical;
        const traits = st.traits || (st.traits = []);
        for (const t of [c.trait, ...(edge > 0.5 && c.trait !== 'tough' ? ['tough'] : [])]) {
            if (!traits.includes(t)) { traits.push(t); done.trait = done.trait || t; }
        }
        if (!makeItem) return done;
        const eq = st.equipment || {};
        // the weapon: forged up to the party's level (one below outside his gaze), never down
        const weaponLevel = Math.max(1, p.weaponLevel - (phase === 'gaze' ? 0 : 1));
        for (const slot of ['mainHand', 'twoHand']) {
            const it = eq[slot];
            if (!it) continue;
            const defId = typeof it === 'string' ? it : (it.defId || it.id);
            const level = (typeof it === 'object' && it.level) || 1;
            if (weaponLevel <= level) continue;
            const better = makeItem(defId, weaponLevel);
            if (better && (better.level || 1) > level) { eq[slot] = better; done.weapon = better.level; }
        }
        // armour against the party's damage, for a humanoid with the slot to wear it (the helmet only in his gaze)
        if ((st.tags || []).includes('HUMANOID')) {
            for (const id of c.armor.slice(0, phase === 'gaze' ? 2 : 1)) {
                const piece = makeItem(id, Math.max(1, p.armorLevel));
                if (!piece || !piece.slot || !(piece.slot in eq) || eq[piece.slot]) continue;
                eq[piece.slot] = piece;
                done.armor.push(id);
            }
        }
        return done;
    },

    /** What he is doing to the world now (PHASE_EFFECTS of the phase, a blood moon counted as at least stirring), with the phase. */
    effects(state = gameState, bloodMoon = false) {
        const d = this.state(state);
        const phase = bloodMoon && PHASES.indexOf(d.phase) < PHASES.indexOf('stirring') ? 'stirring' : d.phase;
        const e = { ...PHASE_EFFECTS[phase], phase };
        // a party far ahead is given less: no gifts in a respite beyond the rest itself, and good traits come harder
        const edge = this.edge(state);
        if (edge > 0) { e.lootBonusChance *= (1 - edge); e.goodTrait *= (1 - 0.5 * edge); }
        if (edge > 0.5 && phase === 'gaze') e.enemyLevel += 1;
        return e;
    },

    /** Moves him on to the world's time: tension from the hours passed, and the phase changes they bring. Only the world's owner moves him. */
    tick(state = gameState, bloodMoon = false) {
        if (!worldSync.ownsWorld) return null;
        const d = this.state(state), now = nowOf(state), t = this.temperament(state);
        const hours = Math.max(0, (now - (d.last ?? now)) / 60);
        d.last = now;
        if (hours <= 0 || !this.noticed(state)) return null;
        const inPhase = (now - (d.since ?? now)) / 60;
        if (d.phase === 'respite') {
            if (inPhase >= t.respiteHours * (1 - 0.4 * Math.max(0, this.edge(state)))) return this._enter(state, 'calm');
            return null;
        }
        if (d.phase === 'gaze') {
            if (inPhase >= t.gazeHours) return this._enter(state, 'respite');
            return null;
        }
        const edge = this.edge(state);
        d.tension += hours * t.tensionPerHour * (bloodMoon ? 2 : 1) * (1 + 0.75 * edge);
        if (d.tension >= THRESHOLDS.gaze) return this._enter(state, 'gaze');
        if (d.phase === 'calm' && d.tension >= THRESHOLDS.stirring) return this._enter(state, 'stirring');
        return null;
    },

    /** A fight is over: he remembers how it went. An easy win feeds his interest, a hard one tires it, a defeat ends his gaze. */
    recordFight({ victory, fled = false, hpLeft = 1, fallen = 0 } = {}, state = gameState) {
        if (!worldSync.ownsWorld || fled || !this.noticed(state)) return null;
        const d = this.state(state);
        const score = !victory ? -1 : (fallen > 0 || hpLeft < 0.4) ? -0.5 : hpLeft > 0.75 ? 1 : 0;
        d.fights = [...(d.fights || []), score].slice(-MEMORY);
        if (!victory) return this._enter(state, 'respite');
        if (d.phase === 'gaze') {
            d.gazeFights = (d.gazeFights || 0) + 1;
            if (d.gazeFights >= this.temperament(state).gazeFights) return this._enter(state, 'respite');
        } else if (d.phase !== 'respite') {
            d.tension = Math.max(0, d.tension + (score > 0 ? 6 : score < 0 ? -8 : 0));
            if (d.tension >= THRESHOLDS.gaze) return this._enter(state, 'gaze');
            if (d.phase === 'calm' && d.tension >= THRESHOLDS.stirring) return this._enter(state, 'stirring');
        }
        this._share(state);
        return null;
    },

    _enter(state, phase) {
        const d = this.state(state);
        if (d.phase === phase) return null;
        d.phase = phase;
        d.since = nowOf(state);
        d.gazeFights = 0;
        if (phase === 'respite') d.tension = 0;
        if (phase === 'calm') d.tension = Math.min(d.tension, THRESHOLDS.stirring - 1);
        const text = SIGNS[phase][this.named(state) ? 1 : 0];
        this._share(state);
        events.emit('DOLOS_SIGN', { phase, text });
        return phase;
    },

    _share(state) {
        if (worldSync.onLocalChange) worldSync.onLocalChange(KEY, { ...this.state(state) });
    },

    /** The chance of a trait, as he weighs it: good traits in his respite, bad ones in his gaze. */
    traitChance(traitId, chance, badTraits, state = gameState, bloodMoon = false) {
        const e = this.effects(state, bloodMoon);
        return clamp(chance * (badTraits.includes(traitId) ? e.badTrait : e.goodTrait), 0, 1);
    }
};
