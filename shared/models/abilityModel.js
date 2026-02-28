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
    get multihit() { return this.config.multihit || null; }
    get targetCount() { 
        return this.config.targeting?.count || 1; 
    }
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
     * @param {Object} user - The EntityModel instance.
     * @param {Object} inventory - (Optional) The party inventory system.
     * @returns {Boolean}
     */
    canPayCost(user, inventory = null) {
        // 1. Stamina
        // We access user.stamina directly (EntityModel getter)
        if (this.cost.stamina && user.stamina < this.cost.stamina) {
            return false;
        }

        // 2. Insight (Magic/Mental Resource)
        if (this.cost.insight && user.insight < this.cost.insight) {
            return false;
        }

        // 3. HP Cost (Blood Magic / Physical Toll)
        if (this.cost.hp) {
            // Prevent suicide by cost unless specified otherwise
            if (user.hp <= this.cost.hp) {
                return false;
            }
        }

        // 4. Item Cost (Consumables)
        // Checks if we have the specific item ID in inventory
        if (this.cost.item) {
            if (!inventory) {
                console.warn(`AbilityModel: Item cost check failed. Inventory system missing.`);
                return false;
            }
            // Logic assumes inventory.getItemCount(itemId) exists
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
        // We use modifyResource with a negative value to deduct cost
        if (this.cost.stamina) {
            user.modifyResource('stamina', -this.cost.stamina);
        }
        
        if (this.cost.insight) {
            user.modifyResource('insight', -this.cost.insight);
        }

        if (this.cost.hp) {
            user.modifyResource('hp', -this.cost.hp);
        }

        // Remove the item from inventory
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
        // EntityModel has an isDead() method
        if (target.isDead()) {
            return scope === 'dead_ally';
        }
        
        // 2. Living Unit Checks (Cannot target dead with normal attacks)
        if (scope === 'dead_ally') return false; 

        // 3. Team Logic
        // Assumes entities have a 'team' property (e.g. 'player', 'enemy')
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

    isFlee() {
        return this.config.behavior === 'flee_battle';
    }
}