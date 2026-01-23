import { ItemDefinitions } from '../data/itemDefinitions.js';

export class ItemModel {
    constructor(defId, instanceState = {}) {
        const definition = ItemDefinitions[defId];
        if (!definition) {
            throw new Error(`[ItemModel] Definition not found for: ${defId}`);
        }

        this.defId = defId;
        // We don't necessarily need to store 'this.definition' if we access it via definitions[defId],
        // but storing it for quick access is fine.
        this.definition = definition;
        
        // Use provided ID (loading save) or generate new one
        this.instanceId = instanceState.instanceId || crypto.randomUUID(); 
        this.qty = instanceState.qty || 1;
    }

    // --- GETTERS (The Proxy Layer) ---
    
    get name() { return this.definition.name; }
    get description() { return this.definition.description; }
    get type() { return this.definition.type; }
    get value() { return this.definition.value; }
    get rarity() { return this.definition.rarity || 'common'; }

    // --- EQUIPMENT SLOTS ---
    // If the definition doesn't specify a slot (e.g. Potion), it returns null
    get slot() { return this.definition.slot || null; }

    // --- VISUALS ---
    get icon() { return this.definition.icon || { col: 0, row: 0 }; }
    get sprite() { return this.definition.sprite || null; } // In-game sprite (if dropped)

    // --- COMBAT STATS ---
    
    // [CRITICAL] Used by StatCalculator to add raw damage
    get attack() { return this.definition.attack || {}; } 
    
    // [CRITICAL] Used by StatCalculator to add raw defense
    get defense() { return this.definition.defense || {}; }

    // [NEW] Attributes (e.g., Ring of Might gives { strength: 5 })
    get attributes() { return this.definition.attributes || {}; }

    // [NEW] Abilities (e.g., Sword gives ["cleave"])
    // This is what EntityModel.equipItem() listens for!
    get grantedAbilities() { return this.definition.grantedAbilities || []; }

    // --- SERIALIZATION ---
    // When saving, we only keep the instance data. The definition is re-linked on load.
    toJSON() {
        return {
            defId: this.defId,
            instanceId: this.instanceId,
            qty: this.qty
        };
    }
}