import { ENTITY_DEFINITIONS } from '../../data/entityDefinitions.js';
import { EntityModel } from '../../models/entityModel.js';
// [NEW] Import the system to calculate XP curves correctly
import { ExperienceSystem } from '../experienceSystem.js'; 

export class EntityFactory {
    
    /**
     * Creates a living Entity instance based on a static definition.
     * @param {string} entityId - The key in ENTITY_DEFINITIONS (e.g., "HUMANOID")
     * @param {Object} overrides - Custom values to merge on top of the blueprint
     * @returns {EntityModel} A new, fully initialized Entity instance
     */
    static create(entityId, overrides = {}) {
        const blueprint = ENTITY_DEFINITIONS[entityId];
        
        if (!blueprint) {
            console.error(`EntityFactory Error: ID '${entityId}' not found in definitions.`);
            return null;
        }

        // 1. Deep Clone Blueprint
        // We use structuredClone for a cleaner, modern deep copy.
        // This 'config' object will become the initial state of the model.
        const config = structuredClone(blueprint);

        // 2. Apply Identity Overrides
        if (overrides.name) config.name = overrides.name;
        if (overrides.sprite) config.sprite = overrides.sprite;
        if (overrides.portrait) config.portrait = overrides.portrait;

        // 3. Merge Arrays & Objects (The "Smart Merge")

        // TAGS: Combine original tags with override tags (No duplicates)
        if (overrides.tags) {
            const existingTags = config.tags || [];
            config.tags = [...new Set([...existingTags, ...overrides.tags])];
        }

        // ATTRIBUTES: Shallow merge (allows tweaking just 'strength' while keeping 'vigor')
        if (overrides.attributes) {
            config.attributes = { ...config.attributes, ...overrides.attributes };
        }

        // BASE STATS: Shallow merge 
        // (Allows creating a "Fast Bear" by passing { baseStats: { speed: 10 } })
        if (overrides.baseStats) {
            config.baseStats = { ...config.baseStats, ...overrides.baseStats };
        }

        // EQUIPMENT: Merge specific slots
        if (overrides.equipment) {
            config.equipment = { ...config.equipment, ...overrides.equipment };
        }
        // Ensure equipment object exists if blueprint didn't have it
        if (!config.equipment) config.equipment = {}; 

        // INVENTORY (Backpack):
        // Definitions usually have 'lootTable', but instances need an 'inventory'.
        if (overrides.inventory) {
            config.inventory = overrides.inventory;
        }
        if (!config.inventory) config.inventory = [];

        // TRAITS: Overwrite or Default
        if (overrides.traits) {
            config.traits = overrides.traits;
        } else if (!config.traits) {
            config.traits = []; 
        }

        // --- [NEW] PROGRESSION LOGIC ---
        // Handle Level overrides and calculate derived XP stats
        
        // A. Determine final Level (Override takes priority -> Config default -> Fallback 1)
        const level = overrides.level ?? config.level ?? 1;
        config.level = level;

        // B. Calculate correct MaxXP for this level using your Exponential Curve
        // If an override is provided for maxXp, use it; otherwise calculate it.
        if (overrides.maxXp) {
            config.maxXp = overrides.maxXp;
        } else {
            // Use the shared math formula so a Lvl 10 wolf has the correct XP cap
            config.maxXp = ExperienceSystem.getMaxXP(level);
        }

        // C. Ensure defaults for new progression properties
        config.xp = overrides.xp ?? config.xp ?? 0;
        config.skillPoints = overrides.skillPoints ?? config.skillPoints ?? 0;

        // -------------------------------

        // 4. Initialize Unique ID
        // Changed from 'instanceId' to 'id' to match EntityModel getter
        config.id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 5. Create the Entity Model
        // The Model wraps this config object and protects it.
        const entity = new EntityModel(config);

        // 6. Fill Resources (The "Spawn Logic")
        // We use the Model's setters to ensure values are clamped correctly.
        // (e.g., You can't start with 100 HP if MaxHP is only 20)
        entity.hp = entity.maxHp; 
        entity.stamina = entity.maxStamina;
        entity.insight = entity.maxInsight;
        
        // Initialize State Flags
        config.isDead = false;

        return entity;
    }
}