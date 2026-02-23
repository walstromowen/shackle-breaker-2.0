import { ENTITY_DEFINITIONS } from '../../data/entityDefinitions.js';
import { EntityModel } from '../../models/entityModel.js';
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
        const config = structuredClone(blueprint);

        // 2. Apply Identity Overrides (Renamed to match EntityDefinitions)
        if (overrides.name) config.name = overrides.name;
        if (overrides.spriteOverworld) config.spriteOverworld = overrides.spriteOverworld;
        if (overrides.spritePortrait) config.spritePortrait = overrides.spritePortrait;

        // 3. Merge Arrays & Objects
        if (overrides.tags) {
            const existingTags = config.tags || [];
            config.tags = [...new Set([...existingTags, ...overrides.tags])];
        }

        // **NEW**: Merge custom injected abilities
        if (overrides.abilities) {
            const existingAbilities = config.abilities || [];
            config.abilities = [...new Set([...existingAbilities, ...overrides.abilities])];
        }

        if (overrides.attributes) {
            config.attributes = { ...config.attributes, ...overrides.attributes };
        }

        if (overrides.baseStats) {
            config.baseStats = { ...config.baseStats, ...overrides.baseStats };
        }

        if (overrides.equipment) {
            config.equipment = { ...config.equipment, ...overrides.equipment };
        }
        if (!config.equipment) config.equipment = {}; 

        if (overrides.traits) {
            config.traits = overrides.traits;
        } else if (!config.traits) {
            config.traits = []; 
        }

        // --- PROGRESSION LOGIC ---
        const level = overrides.level ?? config.level ?? 1;
        config.level = level;

        if (overrides.maxXp) {
            config.maxXp = overrides.maxXp;
        } else {
            config.maxXp = ExperienceSystem.getMaxXP(level);
        }

        config.xp = overrides.xp ?? config.xp ?? 0;
        config.skillPoints = overrides.skillPoints ?? config.skillPoints ?? 0;

        // 4. Initialize Unique ID
        config.id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 5. Create the Entity Model
        // The EntityModel constructor now handles mapping visuals and hydrating abilities automatically.
        const entity = new EntityModel(config);

        // --- NEW: Ensure reward data survives instantiation ---
        if (config.lootTable) entity.lootTable = config.lootTable;
        if (config.currencyReward) entity.currencyReward = config.currencyReward;
        if (config.xpReward) entity.xpReward = config.xpReward;
        // ------------------------------------------------------

        // 6. Fill Resources (Start at max health/stamina)
        // We do this after creation so the StatCalculator can determine the Max values first.
        entity.hp = entity.maxHp; 
        entity.stamina = entity.maxStamina;
        entity.insight = entity.maxInsight;
        
        // Ensure dead state is false on spawn
        config.isDead = false;

        return entity;
    }
}