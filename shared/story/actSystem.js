// shared/story/actSystem.js
// The milestones of the game and the act they put the world in. Every system that makes the world harder asks this one; the numbers are in
// story/actDefinitions.js. Every function takes the state as its last argument (the real gameState by default) so it can be tested with a plain object.
import { gameState } from '../core/gameState.js';
import { events } from '../core/eventBus.js';
import { ACT_DEFINITIONS } from './actDefinitions.js';

const ACT_NUMBERS = Object.keys(ACT_DEFINITIONS).map(Number).sort((a, b) => a - b);

/** The hours of a night, the same split BiomeModel.getTimeOfDay uses. */
const isNightHour = (hour) => hour >= 20 || hour < 6;

export const ActSystem = {
    /** The milestone ids the player has reached (always an array: an old save without any is act 1). */
    getMilestones(state = gameState) {
        if (!Array.isArray(state.milestones)) state.milestones = [];
        return state.milestones;
    },

    hasMilestone(id, state = gameState) {
        return this.getMilestones(state).includes(id);
    },

    /** Records a milestone. Returns true the first time, false if the player already had it. Tells everything that cares (MILESTONE_GRANTED). */
    grantMilestone(id, state = gameState) {
        if (!id || this.hasMilestone(id, state)) return false;
        this.getMilestones(state).push(id);
        events.emit('MILESTONE_GRANTED', { id, act: this.getAct(state) });
        console.log(`[Act] Milestone '${id}' reached: now ${this.getActDefinition(state).name}.`);
        return true;
    },

    /** 1 at the start of the game; the highest act whose milestone has been granted after that. */
    getAct(state = gameState) {
        let act = 1;
        for (const n of ACT_NUMBERS) {
            const def = ACT_DEFINITIONS[n];
            if (def.milestone && this.hasMilestone(def.milestone, state)) act = Math.max(act, n);
        }
        return act;
    },

    /** The act's settings with everything it does not set taken from the acts before it (lighting and enemies are merged one level deep). */
    getActDefinition(state = gameState) {
        return this.getDefinitionOf(this.getAct(state));
    },

    getDefinitionOf(act) {
        const merged = {};
        for (const n of ACT_NUMBERS) {
            if (n > act) break;
            const def = ACT_DEFINITIONS[n];
            for (const [key, value] of Object.entries(def)) {
                if ((key === 'lighting' || key === 'enemies') && value && typeof value === 'object') merged[key] = { ...(merged[key] || {}), ...value };
                else merged[key] = value;
            }
        }
        return merged;
    },

    /** The clock colours / gloom this act replaces ({} in act 1). */
    getLighting(state = gameState) {
        return this.getActDefinition(state).lighting || {};
    },

    /** True on a night of an act with a blood moon (every night of act 2). `hour` is the clock in hours, 0..24. */
    isBloodMoon(hour, state = gameState) {
        return !!this.getActDefinition(state).bloodMoon && isNightHour(hour);
    },

    /**
     * Has this player beaten Darius the Groveler (the last Shackled quest, finished or waiting to be collected) without having seen A Dark Truth,
     * the encounter after the fight that grants act 2 and its quest? A save from before the acts existed, or a player of a party whose screen
     * did not play it (before every player's screen did). SceneManager plays it for them as soon as they stand on the map, so every player sees it.
     */
    owesDarkTruth(state = gameState) {
        const def = ACT_DEFINITIONS[2];
        if (!def || !def.milestone || this.hasMilestone(def.milestone, state)) return false;
        const quests = state.quests || {};
        const done = Array.isArray(quests.completed) && quests.completed.includes('shackled8');
        const progress = quests.active && quests.active.shackled8 && quests.active.shackled8.progress;
        return done || !!(progress && progress.obj_kill_darius >= 1);
    },

    /** On loading a save: true when it owes A Dark Truth (owesDarkTruth). It is not moved into act 2 here: the encounter does that when it plays. */
    catchUp(state = gameState) {
        const owed = this.owesDarkTruth(state);
        if (owed) console.log('[Act] This save has beaten Darius but not seen A Dark Truth: it plays on the map.');
        return owed;
    },

    /**
     * The red pool of moonlight around the player on a blood moon night, or null: { color, radius, strength }, with the strength already scaled by the hour
     * (it fades in over 19:00 to 20:30 and out over 5:00 to 6:00). The lighting pass draws it; it is never used indoors (that is the caller's check).
     */
    getMoonlight(hour, state = gameState) {
        const def = this.getActDefinition(state);
        const moon = def.bloodMoon && def.lighting && def.lighting.moonlight;
        if (!moon) return null;
        let k = 0;
        if (hour >= 20.5 || hour < 5) k = 1;
        else if (hour >= 19) k = (hour - 19) / 1.5;
        else if (hour >= 5 && hour < 6) k = 6 - hour;
        if (k <= 0) return null;
        return { color: moon.color, radius: moon.radius, strength: (moon.strength ?? 0.6) * k };
    },

    /** The multiplier on the chance of an ambush per step at this hour. */
    getBattleRateMultiplier(hour, state = gameState) {
        const def = this.getActDefinition(state);
        if (this.isBloodMoon(hour, state)) return def.bloodMoonBattleRate ?? def.battleRate ?? 1;
        return def.battleRate ?? 1;
    },

    /** Levels added to every enemy in this act (on top of the difficulty's). */
    getEnemyLevelOffset(state = gameState) {
        return this.getActDefinition(state).enemyLevelOffset || 0;
    },

    /** The extra abilities and traits of an enemy in this act, or null when it gets none. */
    getEnemyUpgrade(enemyId, state = gameState) {
        const up = (this.getActDefinition(state).enemies || {})[enemyId];
        if (!up) return null;
        return { abilities: [...(up.abilities || [])], traits: [...(up.traits || [])] };
    },

    /** Does this ambush by day come from the night table (the act's nightByDay chance)? `roll` is a number in [0, 1). */
    nightEnemiesByDay(roll = Math.random(), state = gameState) {
        const chance = this.getActDefinition(state).nightByDay || 0;
        return chance > 0 && roll < chance;
    },

    /**
     * The act's enemyBoosts on a freshly made enemy: maybe one more trait, maybe better gear (each piece it carries 1 to gearLevels levels higher,
     * up to the item's most). Bosses are left as they are made. `rand` gives numbers in [0, 1). Returns what it did: { trait, gear }.
     */
    boostEnemy(entity, { rand = Math.random, makeItem = null } = {}, state = gameState) {
        const b = this.getActDefinition(state).enemyBoosts;
        const done = { trait: null, gear: 0 };
        if (!b || !entity || !entity.state) return done;
        const tags = entity.state.tags || [];
        if (tags.includes('BOSS')) return done;
        const traits = entity.state.traits || (entity.state.traits = []);
        if (b.traitChance && rand() < b.traitChance && Array.isArray(b.traits) && b.traits.length) {
            const fresh = b.traits.filter(t => !traits.includes(t));
            if (fresh.length) { done.trait = fresh[Math.floor(rand() * fresh.length) % fresh.length]; traits.push(done.trait); }
        }
        if (b.gearChance && makeItem && rand() < b.gearChance) {
            const eq = entity.state.equipment || {};
            for (const slot of Object.keys(eq)) {
                const it = eq[slot];
                if (!it) continue;
                const defId = typeof it === 'string' ? it : (it.defId || it.id);
                const level = (typeof it === 'object' && it.level) || 1;
                const up = 1 + Math.floor(rand() * Math.max(1, b.gearLevels || 1));
                const better = makeItem(defId, level + up);
                if (better && better.level > level) { eq[slot] = better; done.gear++; }
            }
        }
        return done;
    },

    /** `minAct` / `maxAct` on a spawn pool, a spawn member or an encounter pool: true when it can be used in the current act. */
    isAvailable(entry, state = gameState) {
        if (!entry) return false;
        const act = this.getAct(state);
        if (entry.minAct !== undefined && act < entry.minAct) return false;
        if (entry.maxAct !== undefined && act > entry.maxAct) return false;
        return true;
    }
};
