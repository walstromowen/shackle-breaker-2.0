// shared/characters/corruptionSystem.js: corruption, the price of magic and of cruelty. Browser-free.
//
// Every character carries a corruption from 0 to 100 (baseStats.corruption; the stat the screens show is that plus anything gear and traits add).
//   - Using a magical ability raises it (onAbilityUsed). So does a cruel choice in an encounter; a kind one lowers it (the MODIFY_CORRUPTION result and the
//     `corruption` field of a decision, in the encounter files).
//   - High corruption has tiers (core/constants.js CORRUPTION.TIERS): at 50 max health is halved and magical damage grows, until it drops below 50 again.
//     StatCalculator applies the tiers every time it runs, so nothing here has to undo them.
//   - At 100 the character is shackled: health 0 and kept there (EntityModel), like a fainted member who cannot be revived. Only the item named by
//     CORRUPTION.UNSHACKLE_ITEM frees them (the `unshackle` ability effect). While one is shackled, outdoors, they may turn on the party
//     (the shackled_betrayal encounter): they fight the rest of the party and, win or lose, are gone for good.
import { CORRUPTION } from '../core/constants.js';
import { StatCalculator } from './statCalculator.js';
import { gameState } from '../core/gameState.js';
import { ActSystem } from '../story/actSystem.js';

const fill = (text, entity) => String(text).replace(/{name}/g, entity?.name || 'The character');

export const CorruptionSystem = {
    /** Has the story told the player about corruption yet? From CORRUPTION.REVEAL_ACT on, the screens show it. */
    isRevealed(state) {
        return (state ? ActSystem.getAct(state) : ActSystem.getAct()) >= CORRUPTION.REVEAL_ACT;
    },

    /** The most stored corruption a character can carry right now: all of it once revealed, one short of the first tier before that (so no penalty is felt unannounced). */
    ceiling(state) {
        if (this.isRevealed(state)) return CORRUPTION.MAX;
        const first = CORRUPTION.TIERS.length ? Math.min(...CORRUPTION.TIERS.map(t => t.at)) : CORRUPTION.MAX + 1;
        return Math.min(CORRUPTION.MAX, first - 1);
    },

    /** The corruption value the screens show and the tiers read: stored corruption plus gear and traits, kept between 0 and 100. */
    valueOf(entity) {
        return entity ? StatCalculator.calculate(entity).corruption : 0;
    },

    /** The tier a character is in right now ({ id, name, ... } from CORRUPTION.TIERS) or null. */
    tierOf(entity) {
        return StatCalculator.corruptionTier(this.valueOf(entity));
    },

    isShackled(entity) {
        return !!(entity && (entity.shackled || entity.state?.shackled));
    },

    /** Is this ability magic? Anything tagged 'magical' is; an ability's own `corruption` number counts too (it decides how much). */
    corruptionOfAbility(ability) {
        if (!ability) return 0;
        const cfg = ability.config || ability;
        if (typeof cfg.corruption === 'number') return cfg.corruption;
        const tags = cfg.tags || ability.tags || [];
        return tags.includes('magical') ? CORRUPTION.PER_MAGIC_USE : 0;
    },

    /**
     * Raises (or, with a negative amount, lowers) a character's corruption by `amount` points, keeping it in range. Returns
     * { amount, before, after, messages: [lines to show], shackled: true when this change shackled them }.
     * Crossing a tier line says so; reaching the top shackles them. A shackled character does not change (nothing to lower until they are freed).
     */
    change(entity, amount) {
        const out = { amount: 0, before: 0, after: 0, messages: [], shackled: false };
        if (!entity || !amount) return out;
        const state = entity.state || entity;
        if (!state.baseStats) return out;
        if (this.isShackled(entity)) { out.before = out.after = this.valueOf(entity); return out; }

        const before = this.valueOf(entity);
        const tierBefore = StatCalculator.corruptionTier(before);
        // The stored part is what moves; gear and traits stay as they are on top of it (StatCalculator adds them and keeps the sum in range)
        state.baseStats.corruption = Math.max(0, Math.min(Math.max(this.ceiling(), state.baseStats.corruption || 0), Math.round((state.baseStats.corruption || 0) + amount)));
        const after = this.valueOf(entity);
        out.amount = after - before;
        out.before = before;
        out.after = after;

        // Shrinking max health (or a fall back to it) must pull the current pools into the new maximums
        entity.hp = entity.hp;
        entity.stamina = entity.stamina;
        entity.insight = entity.insight;

        const tierAfter = StatCalculator.corruptionTier(after);
        if (tierAfter && tierAfter !== tierBefore && after > before && after < CORRUPTION.SHACKLE_AT) {
            if (tierAfter.message) out.messages.push(fill(tierAfter.message, entity));
        } else if (tierBefore && tierBefore !== tierAfter && after < before) {
            out.messages.push(`${entity.name} breathes easier. The ${tierBefore.name.toLowerCase()} grip loosens.`);
        }
        if (after >= CORRUPTION.SHACKLE_AT) {
            this.shackle(entity);
            out.shackled = true;
            out.messages.push(`The darkness closes over ${entity.name}. Iron shackles bind them, and they fall.`);
        }
        return out;
    },

    /** Shackles a character: corruption at the top, health 0 (and held there). */
    shackle(entity) {
        const state = entity.state || entity;
        if (state.shackled) return;
        state.baseStats.corruption = Math.max(state.baseStats.corruption || 0, CORRUPTION.MAX);
        state.shackled = true;
        entity.hp = 0;
    },

    /** Frees a shackled character: they wake with the corruption CORRUPTION.UNSHACKLE_TO and a quarter of their health. Returns false when they were not shackled. */
    unshackle(entity) {
        const state = entity && (entity.state || entity);
        if (!state || !state.shackled) return false;
        state.shackled = false;
        state.baseStats.corruption = CORRUPTION.UNSHACKLE_TO;
        entity.hp = Math.max(1, Math.floor(entity.maxHp * 0.25));
        return true;
    },

    /**
     * A party member used an ability. Magic adds corruption. `actor` is a party member or a battle combatant wrapping one (enemies never gain corruption).
     * Returns the change() result, or null when nothing happened.
     */
    onAbilityUsed(actor, ability) {
        if (!actor || actor.team === 'enemy') return null;
        const entity = actor.originalEntity || actor;
        const members = gameState.party?.members || [];
        if (!members.includes(entity)) return null;
        const amount = this.corruptionOfAbility(ability);
        if (!amount) return null;
        return this.change(entity, amount);
    },

    /** An enemy of the shackled faction who joins the party is no longer born cursed: their natural corruption is taken off (they start clean). */
    cleanseNatural(entity) {
        const stats = entity && entity.state && entity.state.baseStats;
        if (!stats || !stats.naturalCorruption) return false;
        delete stats.naturalCorruption;
        stats.corruption = 0;
        return true;
    },

    /** Party members who are shackled right now. */
    shackledMembers() {
        return (gameState.party?.members || []).filter(m => this.isShackled(m));
    },

    /**
     * Who turns on the party, if anyone does. A shackled member can only betray a party that still has someone standing to fight them:
     * returns the shackled member to betray, or null.
     */
    pickBetrayer() {
        const members = gameState.party?.members || [];
        const shackled = members.filter(m => this.isShackled(m));
        if (shackled.length === 0) return null;
        if (!members.some(m => m.hp > 0 && !this.isShackled(m))) return null;
        return shackled[Math.floor(Math.random() * shackled.length)];
    },

    /** The betrayer leaves the party for good and comes back as an enemy at full health, wearing whatever they still had on. */
    turnAgainstParty(entity) {
        const members = gameState.party?.members;
        const idx = members ? members.indexOf(entity) : -1;
        if (idx === -1) return null;
        members.splice(idx, 1);
        const state = entity.state;
        state.shackled = false;
        state.baseStats.corruption = 0;   // no tier: they fight at full strength, with no penalty to take the edge off
        entity.hp = entity.maxHp;
        entity.stamina = entity.maxStamina;
        entity.insight = entity.maxInsight;
        entity.clearAllStatusEffects();
        entity.xpReward = Math.max(entity.xpReward || 0, 20 + (entity.level || 1) * 10);
        return entity;
    },
};
