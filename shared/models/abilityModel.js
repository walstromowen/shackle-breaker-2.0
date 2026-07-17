import { AbilityDefinitions } from '../data/abilityDefinitions.js';

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
    get type() { return this.config.type || 'physical'; }
    get battleMessage() { return this.config.battleMessage || "{user} uses {ability}!"; }
    
    // Core Logic Data
    get targeting() { return this.config.targeting; }
    get effects() { return this.config.effects || []; }
    get statusEffects() { return this.config.statusEffects || []; }
    
    // ---> NEW: Expose traitRewards for the post-battle reward system <---
    get traitRewards() { return this.config.traitRewards || []; }

    set cost(newCost) { this._dynamicCost = newCost; }
    
    get cost() { return this._dynamicCost || this.config.cost || {}; }
    get multihit() { return this.config.multihit || null; }
    get targetCount() { return this.config.targeting?.count || 1; }
    
    // Stats
    get speedModifier() { return this.config.speedModifier || 1.0; }
    get accuracy() { return this.config.accuracy !== undefined ? this.config.accuracy : 1.0; }
    
    // Visuals
    get animationId() { return this.config.animationId || "default_attack"; }

    // =========================================================================
    // 2. LOGIC: COST & USABILITY
    // =========================================================================
    canPayCost(user, inventory = null) {
        if (this.cost.stamina && user.stamina < this.cost.stamina) return false;
        if (this.cost.insight && user.insight < this.cost.insight) return false;
        
        if (this.cost.hp) {
            if (user.hp <= this.cost.hp) return false;
        }
        
        if (this.cost.item) {
            if (!inventory) {
                console.warn(`AbilityModel: Item cost check failed. Inventory system missing.`);
                return false;
            }
            return inventory.hasItem(this.cost.item, this.cost.amount || 1);
        }
        
        return true;
    }

    payCost(user, inventory = null) {
        if (this.cost.stamina) user.modifyResource('stamina', -this.cost.stamina);
        if (this.cost.insight) user.modifyResource('insight', -this.cost.insight);
        if (this.cost.hp) user.modifyResource('hp', -this.cost.hp);
        
        if (this.cost.item && inventory) {
            inventory.removeItem(this.cost.item, this.cost.amount || 1);
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