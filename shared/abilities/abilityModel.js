import { AbilityDefinitions } from './abilityDefinitions.js';
import { StatCalculator } from '../characters/statCalculator.js';

// BALANCE KNOBS: stamina, insight and hp costs grow with the user's max pool of that resource, so a bigger pool means more casts,
// but not proportionally more. Authored costs in abilityDefinitions.js are what a character with the resource's `ref` pool pays
// (a fresh character has 30 stamina: 10 base + 2 per Dex x 10, so three 10-cost Slashes are exactly one full bar; same for insight;
// and 35 max hp: 20 base + 15 from 10 Vigor). Below that pool nothing gets cheaper; above it:
//   paid = authored x (pool / ref) ^ exponent
// Exponent 0 = flat costs (the old behaviour), 1 = fully proportional to the pool (a bigger pool would be worth nothing).
// Item costs are never scaled.
const COST_RESOURCES = {
    stamina: { poolKey: 'maxStamina', ref: 30, exponent: 0.5 },
    insight: { poolKey: 'maxInsight', ref: 30, exponent: 0.5 },
    hp:      { poolKey: 'maxHp',      ref: 35, exponent: 0.5 },
};

export class AbilityModel {
    constructor(abilityId) {
        this.id = abilityId;
        this.config = AbilityDefinitions[abilityId];
        
        if (!this.config) {
            console.error(`AbilityModel: ID "${abilityId}" not found in definitions.`);
            this.config = AbilityDefinitions['punch'] || { name: "Unknown", cost: {}, targeting: { scope: "enemy", select: "single" } };
        }
    }

    // =========================================================================
    // 1. GETTERS (Syntactic Sugar for easy access)
    // =========================================================================
    get name() { return this.config.name; }
    get description() { return this.config.description; }
    get icon() { return this.config.icon; }
    //get type() { return this.config.type || 'physical'; }
    get range() { return this.config.range || 'melee'; }
    get tags() { return this.config.tags || []; }
    get battleMessage() { return this.config.battleMessage || "{user} uses {ability}!"; }
    
    // Core Logic Data
    get targeting() { return this.config.targeting; }
    get effects() { return this.config.effects || []; }
    get statusEffects() { return this.config.statusEffects || []; }
    
    // ---> NEW: Expose traitRewards for the post-battle reward system <---
    get traitRewards() { return this.config.traitRewards || []; }

    set cost(newCost) { this._dynamicCost = newCost; }
    
    // The cost the OWNER pays. `owner` is set by CombatantModel on each combatant's own copy of the ability, so the HUD reading
    // ability.cost shows what canPayCost / payCost charge. An ability with no owner (a bare factory instance) shows the authored cost.
    get cost() { return this.costFor(this.owner); }
    get multihit() { return this.config.multihit || null; }
    get targetCount() { return this.config.targeting?.count || 1; }

    /**
     * Splash-style multi-target: the player picks N DISTINCT targets, one shared animation plays on all of
     * them at once, and the effect is applied to each. Derived from the data: select 'multiple' without
     * allowRepeats (Flamethrower, Waterfall...). Abilities that allow repeats (Magic Missile) stay sequential.
     * Optional override: targeting.simultaneous = true | false.
     */
    get isSplash() {
        const t = this.config.targeting;
        if (!t || t.select !== 'multiple') return false;
        if (t.simultaneous !== undefined) return !!t.simultaneous;
        return !t.allowRepeats;
    }
    
    // Stats
    get speedModifier() { return this.config.speedModifier || 1.0; }
    get accuracy() { return this.config.accuracy !== undefined ? this.config.accuracy : 1.0; }
    
    // Visuals
    get animationId() { return this.config.animationId || "default_attack"; }

    // =========================================================================
    // 2. LOGIC: COST & USABILITY
    // =========================================================================
    /** The authored cost, with stamina / insight / hp scaled to `user`'s max pool of that resource (see COST_RESOURCES). Item overrides (this.cost = {...}) are never scaled. */
    costFor(user = this.owner) {
        if (this._dynamicCost) return this._dynamicCost;
        return AbilityModel.scaleCost(this.config.cost || {}, user);
    }

    /** 1 up to the resource's reference pool, then grows with the pool by that resource's exponent. */
    static costScale(pool, resource = 'stamina') {
        const { ref, exponent } = COST_RESOURCES[resource];
        if (!(pool > ref)) return 1;
        return Math.pow(pool / ref, exponent);
    }

    /** Max stamina / insight / hp of a combatant (a getter) or of a raw entity (worked out with StatCalculator). */
    static poolOf(user, resource) {
        const key = COST_RESOURCES[resource].poolKey;
        if (typeof user[key] === 'number') return user[key];
        return StatCalculator.calculateDetailed(user.originalEntity || user)[key]?.total ?? 0;
    }

    /**
     * Scales the stamina / insight / hp part of a cost object; returns the same object when there is nothing to scale.
     * The pool size comes from `pools` ({ stamina, insight, hp } max values, e.g. from the character summary's derived stats) when given,
     * otherwise from `user`. With neither, the authored cost is returned (the pool size is unknown).
     */
    static scaleCost(cost, user, pools = null) {
        if (!cost || !Object.keys(COST_RESOURCES).some(r => cost[r])) return cost || {};
        const scaled = { ...cost };
        for (const resource of Object.keys(COST_RESOURCES)) {
            if (!cost[resource]) continue;
            const pool = pools?.[resource] ?? (user ? AbilityModel.poolOf(user, resource) : null);
            if (!Number.isFinite(pool)) continue;
            scaled[resource] = Math.max(1, Math.round(cost[resource] * AbilityModel.costScale(pool, resource)));
        }
        return scaled;
    }

    canPayCost(user, inventory = null) {
        const cost = this.costFor(user);
        if (cost.stamina && user.stamina < cost.stamina) return false;
        if (cost.insight && user.insight < cost.insight) return false;

        if (cost.hp) {
            if (user.hp <= cost.hp) return false;
        }

        if (cost.item) {
            if (!inventory) {
                console.warn(`AbilityModel: Item cost check failed. Inventory system missing.`);
                return false;
            }
            return inventory.hasItem(cost.item, cost.amount || 1);
        }

        return true;
    }

    payCost(user, inventory = null) {
        const cost = this.costFor(user);
        if (cost.stamina) user.modifyResource('stamina', -cost.stamina);
        if (cost.insight) user.modifyResource('insight', -cost.insight);
        if (cost.hp) user.modifyResource('hp', -cost.hp);

        if (cost.item && inventory) {
            inventory.removeItem(cost.item, cost.amount || 1);
        }
    }

    // =========================================================================
    // 3. LOGIC: TARGETING VALIDATION
    // =========================================================================
    isValidTarget(attacker, target) {
        const scope = this.targeting.scope;
        
        if (target.isDead()) {
            return scope === 'dead_ally';
        }
        
        if (scope === 'dead_ally') return false;
        
        const isAlly = (attacker.team === target.team);
        
        switch (scope) {
            case 'self': return attacker === target;
            case 'ally': return isAlly;
            case 'enemy': return !isAlly;
            case 'all_enemies': return !isAlly;
            case 'all_allies': return isAlly;
            case 'space': return false;
            default: return true;
        }
    }

    requiresSelection() {
        const select = this.targeting.select;
        return (select === 'single' || select === 'multiple' || select === 'row');
    }

    // =========================================================================
    // 3b. LOGIC: WHERE CAN IT BE USED? ('battle' | 'overworld' | 'both')
    // =========================================================================
    /**
     * Set `context` on the ability to say so. Without it the answer is worked out, so abilities written before
     * this existed keep working: anything that needs an enemy, a free space or battle flow is 'battle'; everything
     * else (Minor Heal, Rest, ally items) is 'both'. A 'overworld' ability is never offered, queued or run in a fight.
     * Static, so AbilitySystem can ask about a raw definition without building a model.
     */
    static contextOf(def) {
        if (!def) return 'battle';
        if (def.context) return def.context;
        const scope = def.targeting && def.targeting.scope;
        if (['enemy', 'all_enemies', 'random_enemy', 'space'].includes(scope)) return 'battle';
        if (def.behavior) return 'battle'; // charge_attack, flee_battle, switch_party
        if ((def.effects || []).some(e => e.type === 'summon' || e.type === 'switch_self')) return 'battle';
        return 'both';
    }

    get context() { return AbilityModel.contextOf(this.config); }

    /** where = 'battle' | 'overworld' */
    usableIn(where) {
        const ctx = this.context;
        return ctx === 'both' || ctx === where;
    }

    // =========================================================================
    // 4. LOGIC: BEHAVIOR FLAGS
    // =========================================================================
    isCharging() { return this.config.behavior === 'charge_attack'; }
    
    isSwitchMove() {
        if (this.config.behavior === 'switch_party') return true;
        return this.effects.some(eff => eff.type === 'switch_self');
    }
    
    isSummon() { return this.effects.some(eff => eff.type === 'summon'); }
    isFlee() { return this.config.behavior === 'flee_battle'; }
}