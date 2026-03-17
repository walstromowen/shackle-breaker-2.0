import { ItemDefinitions } from '../data/itemDefinitions.js';

export class ItemModel {
    constructor(defId, instanceState = {}) {
        const definition = ItemDefinitions[defId];
        if (!definition) {
            throw new Error(`[ItemModel] Definition not found for: ${defId}`);
        }

        this.defId = defId;
        this.definition = definition;
        
        // Unique ID for this specific item instance (persists across saves)
        this.instanceId = instanceState.instanceId || crypto.randomUUID(); 
        
        // Quantity defaults to 1
        this.qty = instanceState.qty || 1;

        // --- NEW: Track instance level (defaults to 1) ---
        this.level = instanceState.level || 1;
    }

    // --- STACKING SETTINGS ---
    get stackable() { return this.definition.stackable || false; }
    get maxStack() { return this.definition.maxStack || 1; }

    // --- UPGRADE PROPERTIES (New) ---
    get maxLevel() { return this.definition.maxLevel || 1; }
    get isUpgradeable() { return this.maxLevel > 1; }
    get isMaxLevel() { return this.level >= this.maxLevel; }

    get nextUpgradeCost() {
        if (!this.isUpgradeable || this.isMaxLevel) return null;
        return this.definition.upgradeCosts[this.level + 1];
    }

    // --- BASIC INFO ---
    get name() { return this.definition.name; }
    get description() { return this.definition.description; }
    get type() { return this.definition.type; }
    get value() { return this.definition.value; }
    get slot() { return this.definition.slot || null; }
    get icon() { return this.definition.icon || { col: 0, row: 0 }; }
    
    // --- USABILITY ---
    // Returns array of contexts, e.g. ['menu', 'battle']
    get usability() { return this.definition.usability || []; }

    // --- DYNAMIC STATS (Updated for scaling) ---
    get attack() { 
        const baseAttack = this.definition.attack || {};
        const growth = this.definition.statGrowth?.attack || {};
        
        if (this.level === 1 || Object.keys(growth).length === 0) return baseAttack;

        const currentAttack = { ...baseAttack };
        const levelUps = this.level - 1;

        for (const [stat, value] of Object.entries(growth)) {
            currentAttack[stat] = (currentAttack[stat] || 0) + (value * levelUps);
        }

        return currentAttack;
    } 
    
    get defense() { 
        const baseDefense = this.definition.defense || {};
        const growth = this.definition.statGrowth?.defense || {};
        
        if (this.level === 1 || Object.keys(growth).length === 0) return baseDefense;

        const currentDefense = { ...baseDefense };
        const levelUps = this.level - 1;

        for (const [stat, value] of Object.entries(growth)) {
            currentDefense[stat] = (currentDefense[stat] || 0) + (value * levelUps);
        }

        return currentDefense;
    }

    get resistances() { return this.definition.resistances || {}; }
    
    // Secondary combat stats (crit, speed, etc.)
    get combat() { return this.definition.combat || {}; }

    // Resource modifiers (maxHp, maxStamina, etc.)
    get resources() { return this.definition.resources || {}; }

    // Core attributes (strength, intelligence, etc.)
    get attributes() { return this.definition.attributes || {}; }

    // --- ABILITIES (Updated for level unlocks) ---
    get grantedAbilities() { 
        const baseAbilities = this.definition.grantedAbilities || [];
        
        // If level 1 or no unlocks exist, just return base abilities
        if (this.level === 1 || !this.definition.abilityUnlocks) {
            return baseAbilities;
        }

        // Otherwise, gather all abilities up to the current level
        let allAbilities = [...baseAbilities];
        const unlocks = this.definition.abilityUnlocks;

        for (let lvl = 2; lvl <= this.level; lvl++) {
            if (unlocks[lvl]) {
                allAbilities.push(...unlocks[lvl]); 
            }
        }

        // Return a Set converted back to an array to strip duplicates
        return [...new Set(allAbilities)]; 
    }

    get nextAbilityUnlocks() {
        if (!this.isUpgradeable || this.isMaxLevel || !this.definition.abilityUnlocks) return [];
        return this.definition.abilityUnlocks[this.level + 1] || [];
    }

    get useAbility() { return this.definition.useAbility || null; }

    // --- SERIALIZATION (Updated to save level) ---
    toJSON() {
        return {
            defId: this.defId,
            instanceId: this.instanceId,
            qty: this.qty,
            level: this.level // IMPORTANT: Saves the item's level!
        };
    }
}