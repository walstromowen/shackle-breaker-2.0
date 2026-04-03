import { ENTITY_DEFINITIONS } from '../../data/entityDefinitions.js';
import { EntityModel } from '../../models/entityModel.js';
import { ExperienceSystem } from '../experienceSystem.js'; 

export class EntityFactory {
    
    static create(entityId, levelOrOverrides = 1, overrides = {}) {
        const blueprint = ENTITY_DEFINITIONS[entityId];
        
        if (!blueprint) {
            console.error(`EntityFactory Error: ID '${entityId}' not found in definitions.`);
            return null;
        }

        // --- Smart Parameter Parsing ---
        let level = 1;
        let finalOverrides = overrides;

        if (typeof levelOrOverrides === 'object') {
            finalOverrides = levelOrOverrides;
            level = finalOverrides.level || blueprint.level || 1;
        } else {
            level = levelOrOverrides;
        }

        // 1. Deep Clone Blueprint
        const config = structuredClone(blueprint);

        // 2. Apply Identity Overrides
        if (finalOverrides.name) config.name = finalOverrides.name;
        if (finalOverrides.spriteOverworld) config.spriteOverworld = finalOverrides.spriteOverworld;
        if (finalOverrides.spritePortrait) config.spritePortrait = finalOverrides.spritePortrait;

        if (finalOverrides.crySound) config.crySound = finalOverrides.crySound;
        if (finalOverrides.deathSound) config.deathSound = finalOverrides.deathSound;
        if (finalOverrides.battlePortraitFramesFront !== undefined) config.battlePortraitFramesFront = finalOverrides.battlePortraitFramesFront;
        if (finalOverrides.battlePortraitFramesBack !== undefined) config.battlePortraitFramesBack = finalOverrides.battlePortraitFramesBack;
        
        // 3. Merge Arrays & Objects
        if (finalOverrides.tags) {
            const existingTags = config.tags || [];
            config.tags = [...new Set([...existingTags, ...finalOverrides.tags])];
        }

        if (finalOverrides.abilities) {
            const existingAbilities = config.abilities || [];
            config.abilities = [...new Set([...existingAbilities, ...finalOverrides.abilities])];
        }

        if (finalOverrides.statMultipliers) {
            config.statMultipliers = { ...config.statMultipliers, ...finalOverrides.statMultipliers };
        }

        if (finalOverrides.attributes) {
            config.attributes = { ...config.attributes, ...finalOverrides.attributes };
        }

        if (finalOverrides.baseStats) {
            config.baseStats = { ...config.baseStats, ...finalOverrides.baseStats };
        }

        // --- EQUIPMENT INJECTION ---
        if (finalOverrides.equipment) {
            config.equipment = { ...config.equipment, ...finalOverrides.equipment };
        }
        if (!config.equipment) config.equipment = {}; 

        // --- TRAITS INJECTION ---
        if (!config.traits) config.traits = []; 
        if (finalOverrides.traits && Array.isArray(finalOverrides.traits)) {
            // Push new custom traits into the entity's innate traits
            config.traits.push(...finalOverrides.traits);
            // Remove duplicates just in case
            config.traits = [...new Set(config.traits)];
        }

        // --- PROGRESSION LOGIC ---
        config.level = finalOverrides.level ?? level;

        if (finalOverrides.maxXp) {
            config.maxXp = finalOverrides.maxXp;
        } else {
            config.maxXp = ExperienceSystem.getMaxXP(config.level);
        }

        config.xp = finalOverrides.xp ?? config.xp ?? 0;
        config.skillPoints = finalOverrides.skillPoints ?? config.skillPoints ?? 0;

        this._applyLevelScaling(config, config.level);

        // 4. Initialize Unique ID
        config.id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 5. Create the Entity Model
        const entity = new EntityModel(config);

        if (config.lootTable) entity.lootTable = config.lootTable;
        if (config.currencyReward) entity.currencyReward = config.currencyReward;
        if (config.xpReward) entity.xpReward = config.xpReward;

        // 6. Fill Resources
        entity.hp = entity.maxHp; 
        entity.stamina = entity.maxStamina;
        entity.insight = entity.maxInsight;
        
        config.isDead = false;

        return entity;
    }

    static _applyLevelScaling(config, level) {
        const levelDiff = level - 1;
        const totalPointsToDistribute = levelDiff * 1; 

        if (config.attributes && totalPointsToDistribute > 0) {
            const sortedAttributes = Object.keys(config.attributes).sort(
                (a, b) => config.attributes[b] - config.attributes[a]
            );

            for (let i = 0; i < totalPointsToDistribute; i++) {
                const attrToBoost = sortedAttributes[i % sortedAttributes.length];
                config.attributes[attrToBoost] += 1;
            }
        }

        if (config.baseStats) {
            config.baseStats.maxHp += (levelDiff * 2); 
        }

        if (config.currencyReward) {
            config.currencyReward.min += Math.floor(levelDiff * 1.5);
            config.currencyReward.max += Math.floor(levelDiff * 3.5);
        }
        
        if (config.xpReward) {
             config.xpReward = Math.floor(config.xpReward * Math.pow(1.1, levelDiff));
        }
    }
}