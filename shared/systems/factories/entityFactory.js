import { ENTITY_DEFINITIONS } from '../../data/entityDefinitions.js';
import { Entity } from '../../../shared/models/entityModel.js';

export class EntityFactory {
    
    /**
     * Creates a living Entity instance based on a static definition.
     * @param {string} entityId - The key in ENTITY_DEFINITIONS (e.g., "PLAYER")
     * @param {Object} overrides - Custom values (name, attributes, etc.)
     * @returns {Entity} A new Entity instance
     */
    static create(entityId, overrides = {}) {
        const blueprint = ENTITY_DEFINITIONS[entityId];
        if (!blueprint) {
            console.error(`EntityFactory Error: ID '${entityId}' not found in definitions.`);
            return null;
        }

        // 1. Deep Clone Blueprint to avoid modifying the original definition
        const state = JSON.parse(JSON.stringify(blueprint));

        // 2. Apply Identity Overrides
        if (overrides.name) state.name = overrides.name;
        if (overrides.origin) state.origin = overrides.origin;
        if (overrides.spriteIndex !== undefined) state.spriteIndex = overrides.spriteIndex;

        // Merge Attributes (Combine Blueprint + Override)
        if (overrides.attributes) {
            state.attributes = { ...state.attributes, ...overrides.attributes };
        }

        // Merge Traits
        if (overrides.traits) {
            state.traits = overrides.traits;
        } else if (!state.traits) {
            state.traits = []; 
        }

        // Merge Equipment
        if (overrides.equipment) {
            state.equipment = { ...state.equipment, ...overrides.equipment };
        }
        if (!state.equipment) state.equipment = {}; 

        // Merge Inventory
        if (overrides.inventory) {
            state.inventory = overrides.inventory;
        }
        if (!state.inventory) state.inventory = [];

        // 3. Initialize Unique ID
        state.instanceId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 4. Create the Entity Wrapper
        // We do this now so we can access the getters (maxHp, etc.) in the next step
        const entity = new Entity(state);

        // 5. Initialize Live State
        // This pulls the calculated values directly from entityModel.js
        state.currentHp = entity.maxHp; 
        state.currentStamina = entity.maxStamina;
        state.currentInsight = entity.maxInsight;
        state.isDead = false;

        return entity;
    }
}