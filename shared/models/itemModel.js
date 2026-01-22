import { ItemDefinitions } from '../data/itemDefinitions.js';

export class ItemModel {
    constructor(defId, instanceState = {}) {
        // 1. Validate the ID exists
        const definition = ItemDefinitions[defId];
        if (!definition) {
            throw new Error(`[ItemModel] Definition not found for: ${defId}`);
        }

        // 2. Store the Reference ID
        this.defId = defId;

        // 3. Merge Definition with Instance State
        // This allows us to access 'item.name' directly without digging into definition every time,
        // but creates a clear separation if we want to change something (like renaming a crafted item).
        this.definition = definition;
        
        // Runtime specifics (Optional: UUIDs, durability, etc.)
        this.instanceId = instanceState.instanceId || crypto.randomUUID(); 
        this.qty = instanceState.qty || 1;
    }

    // --- GETTERS (The "Interface") ---
    
    get name() { return this.definition.name; }
    get description() { return this.definition.description; }
    get slot() { return this.definition.slot; }
    get type() { return this.definition.type; }
    
    // Stats might be modified by runtime state (e.g. broken item = 0 damage)
    get damage() { return this.definition.damage || {}; }
    get defense() { return this.definition.defense || {}; }
    
    get value() { return this.definition.value; }
}