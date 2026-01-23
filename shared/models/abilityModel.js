/**
 * shared/logic/AbilityModel.js
 * * This model wraps the raw data from AbilityDefinitions.js
 * * It provides helper methods to check costs, validate targets, and format UI data.
 */

import { AbilityDefinitions } from '../data/abilityDefinitions.js';

export class AbilityModel {
    
    constructor(abilityId) {
        this.id = abilityId;
        this.config = AbilityDefinitions[abilityId];

        if (!this.config) {
            console.error(`AbilityModel: ID "${abilityId}" not found in definitions.`);
            // Fallback to a basic move to prevent crash
            // We use 'punch' as the safe default since it is the basic humanoid move
            this.config = AbilityDefinitions['punch'] || { 
                name: "Unknown", 
                cost: {}, 
                targeting: { scope: "enemy", select: "single" } 
            };
        }
    }

    // =========================================================================
    // 1. GETTERS (Syntactic Sugar for easy access)
    // =========================================================================

    get name() { return this.config.name; }
    get description() { return this.config.description; }
    get icon() { return this.config.icon; }
    get type() { return this.config.type || 'physical'; } 
    
    // Core Logic Data
    get targeting() { return this.config.targeting; }
    get effects() { return this.config.effects || []; }
    get statusEffects() { return this.config.statusEffects || []; }
    get cost() { return this.config.cost || {}; }
    
    // Stats
    get speedModifier() { return this.config.speedModifier || 1.0; }
    get accuracy() { return this.config.accuracy !== undefined ? this.config.accuracy : 1.0; }

    // Visuals
    get animation() { 
        return this.config.animation || { attacker: "attack", effect: "hit", audio: "hit" }; 
    }

    // =========================================================================
    // 2. LOGIC: COST & USABILITY
    // =========================================================================

    /**
     * Checks if the user has enough HP, Stamina, Insight, or Items to use this.
     * @param {Object} user - The combatant entity using the move.
     * @param {Object} inventory - (Optional) The party inventory system.
     * @returns {Boolean}
     */
    canPayCost(user, inventory = null) {
        // 1. Stamina
        if (this.cost.stamina && user.stats.stamina.current < this.cost.stamina) {
            return false;
        }

        // 2. Insight (Magic/Mental Resource)
        if (this.cost.insight && user.stats.insight.current < this.cost.insight) {
            return false;
        }

        // 3. HP Cost (Blood Magic / Physical Toll)
        if (this.cost.hp) {
            // Prevent suicide by cost unless specified otherwise
            if (user.stats.hp.current <= this.cost.hp) {
                return false;
            }
        }

        // 4. Item Cost (Consumables)
        // If the ability costs an item (e.g. "potion_hp_qty"), we check the inventory
        if (this.cost.item) {
            if (!inventory) {
                console.warn(`AbilityModel: Item cost check failed. Inventory system missing.`);
                return false;
            }
            // Check inventory count for this item ID
            const count = inventory.getItemCount(this.cost.item);
            return count >= (this.cost.amount || 1);
        }

        return true;
    }

    /**
     * Deducts the resources from the user/inventory.
     * @param {Object} user 
     * @param {Object} inventory 
     */
    payCost(user, inventory = null) {
        if (this.cost.stamina) {
            user.modifyStat('stamina', -this.cost.stamina);
        }
        
        if (this.cost.insight) {
            user.modifyStat('insight', -this.cost.insight);
        }

        if (this.cost.hp) {
            user.modifyStat('hp', -this.cost.hp);
        }

        if (this.cost.item && inventory) {
            inventory.removeItem(this.cost.item, this.cost.amount || 1);
        }
    }

    // =========================================================================
    // 3. LOGIC: TARGETING VALIDATION
    // =========================================================================

    /**
     * Validates if a specific target is valid for this ability.
     * @param {Object} attacker 
     * @param {Object} target 
     * @returns {Boolean}
     */
    isValidTarget(attacker, target) {
        const scope = this.targeting.scope;

        // 1. Dead Unit Checks (Resurrection)
        if (target.isDead()) {
            return scope === 'dead_ally';
        }
        
        // 2. Living Unit Checks (Cannot target dead with normal attacks)
        if (scope === 'dead_ally') return false; 

        // 3. Team Logic
        const isAlly = (attacker.team === target.team);
        
        switch (scope) {
            case 'self':
                return attacker === target;
            case 'ally':
                return isAlly; // Can be self or others on same team
            case 'enemy':
                return !isAlly;
            case 'all_enemies':
                return !isAlly; // Usually auto-selected, but validation stands
            case 'all_allies':
                return isAlly;
            case 'space':
                return false; // Spaces aren't units, handled separately
            default:
                return true;
        }
    }

    /**
     * Returns true if this ability needs the UI to open a selection menu.
     * Returns false if it auto-targets (Self, Random, All).
     */
    requiresSelection() {
        const select = this.targeting.select;
        return (select === 'single' || select === 'multiple' || select === 'row');
    }

    // =========================================================================
    // 4. LOGIC: BEHAVIOR FLAGS
    // =========================================================================

    isCharging() {
        return this.config.behavior === 'charge_attack';
    }

    isSwitchMove() {
        // Checks if it is a 'switch' behavior or contains a switch effect
        if (this.config.behavior === 'switch_party') return true;
        return this.effects.some(eff => eff.type === 'switch_self');
    }

    isSummon() {
        return this.effects.some(eff => eff.type === 'summon');
    }

}