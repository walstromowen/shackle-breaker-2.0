import { ItemDefinitions } from '../data/itemDefinitions.js';

export class ItemModel {
    constructor(defId, instanceState = {}) {
        const definition = ItemDefinitions[defId];
        if (!definition) {
            throw new Error(`[ItemModel] Definition not found for: ${defId}`);
        }

        this.defId = defId;
        this.definition = definition;
        
        this.instanceId = instanceState.instanceId || crypto.randomUUID(); 
        this.qty = instanceState.qty || 1;
    }

    // --- BASIC GETTERS ---
    get name() { return this.definition.name; }
    get description() { return this.definition.description; }
    get type() { return this.definition.type; }
    get value() { return this.definition.value; }
    get rarity() { return this.definition.rarity || 'common'; }
    get slot() { return this.definition.slot || null; }
    get icon() { return this.definition.icon || { col: 0, row: 0 }; }

    // --- STANDARDIZED STAT GETTERS ---
    // These now point exactly to the keys the StatCalculator expects
    
    get attack() { return this.definition.attack || {}; } 
    
    // [CHANGED] Standardized to plural 'defenses'
    get defenses() { return this.definition.defenses || {}; }

    // [NEW] Standardized to 'resistances'
    get resistances() { return this.definition.resistances || {}; }

    // [NEW] Standardized to 'combat' (Speed, Crit, etc)
    get combat() { return this.definition.combat || {}; }

    // [NEW] Standardized to 'resources' (HP, Stamina)
    get resources() { return this.definition.resources || {}; }

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