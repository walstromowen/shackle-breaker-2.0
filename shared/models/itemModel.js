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

    // --- GETTERS ---
    
    get name() { return this.definition.name; }
    get description() { return this.definition.description; }
    get slot() { return this.definition.slot; }
    get type() { return this.definition.type; }
    
    // [CHANGED] Renamed from 'damage' to 'attack' to match your new schema
    get attack() { return this.definition.attack || {}; } 
    
    get defense() { return this.definition.defense || {}; }
    get value() { return this.definition.value; }

    // Expose the icon coordinates
    get icon() { return this.definition.icon || { col: 0, row: 0 }; }
}