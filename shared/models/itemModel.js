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
    }

    // --- STACKING SETTINGS ---
    get stackable() { return this.definition.stackable || false; }
    get maxStack() { return this.definition.maxStack || 1; }

    // --- BASIC INFO ---
    get name() { return this.definition.name; }
    get description() { return this.definition.description; }
    get type() { return this.definition.type; }
    get value() { return this.definition.value; }
    get rarity() { return this.definition.rarity || 'common'; }
    get slot() { return this.definition.slot || null; }
    get icon() { return this.definition.icon || { col: 0, row: 0 }; }

    // --- STATS ---
    // These align with StatCalculator expectations
    
    get attack() { return this.definition.attack || {}; } 
    
    // Fixed: Now uses singular 'defense' to match ItemDefinitions
    get defense() { return this.definition.defense || {}; }

    get resistances() { return this.definition.resistances || {}; }
    
    // Secondary combat stats (crit, speed, etc.)
    get combat() { return this.definition.combat || {}; }

    // Resource modifiers (maxHp, maxStamina, etc.)
    get resources() { return this.definition.resources || {}; }

    // Core attributes (strength, intelligence, etc.)
    get attributes() { return this.definition.attributes || {}; }

    // --- ABILITIES ---
    get grantedAbilities() { return this.definition.grantedAbilities || []; }
    get useAbility() { return this.definition.useAbility || null; }

    // --- SERIALIZATION ---
    toJSON() {
        return {
            defId: this.defId,
            instanceId: this.instanceId,
            qty: this.qty
        };
    }
}