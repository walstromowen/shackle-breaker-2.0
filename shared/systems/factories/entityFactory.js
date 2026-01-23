/**
 * shared/systems/factories/entityFactory.js
 */

import { ENTITY_DEFINITIONS } from '../../data/entityDefinitions.js';
import { EntityModel } from '../../models/entityModel.js';
import { ExperienceSystem } from '../experienceSystem.js'; 
import { AbilityFactory } from './abilityFactory.js';

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

        // 2. Apply Identity Overrides
        if (overrides.name) config.name = overrides.name;
        if (overrides.sprite) config.sprite = overrides.sprite;
        if (overrides.portrait) config.portrait = overrides.portrait;

        // 3. Merge Arrays & Objects
        if (overrides.tags) {
            const existingTags = config.tags || [];
            config.tags = [...new Set([...existingTags, ...overrides.tags])];
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

        if (overrides.inventory) {
            config.inventory = overrides.inventory;
        }
        if (!config.inventory) config.inventory = [];

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
        const entity = new EntityModel(config);

        // 6. Fill Resources
        entity.hp = entity.maxHp; 
        entity.stamina = entity.maxStamina;
        entity.insight = entity.maxInsight;
        config.isDead = false;

        // =========================================================
        // 7. [UPDATED] HYDRATE ABILITIES (INNATE)
        // =========================================================
        // We load the abilities defined in the JSON (like "bite" or "growl")
        // and tag them as 'innate' so they are never removed by equipment logic.
        if (config.abilities && Array.isArray(config.abilities)) {
            const innateAbilities = AbilityFactory.createAbilities(config.abilities);
            
            if (typeof entity.addAbilities === 'function') {
                // [CHANGE] Pass 'innate' to lock these as permanent skills
                entity.addAbilities(innateAbilities, 'innate');
            } else {
                // Fallback: Manually tag and push if method missing
                innateAbilities.forEach(a => a.source = 'innate');
                entity.abilities.push(...innateAbilities);
            }
        }

        return entity;
    }
}