import { ENTITY_DEFINITIONS } from '../../data/entityDefinitions.js';
import { EntityModel } from '../../models/entityModel.js';
import { ExperienceSystem } from '../experienceSystem.js'; 

export class EntityFactory {
    
    /**
     * Creates a living Entity instance based on a static definition.
     * @param {string} entityId - The key in ENTITY_DEFINITIONS (e.g., "HUMANOID")
     * @param {number|Object} levelOrOverrides - The level to spawn at, OR the overrides object for backwards compatibility.
     * @param {Object} overrides - Custom values to merge on top of the blueprint
     * @returns {EntityModel} A new, fully initialized Entity instance
     */
    static create(entityId, levelOrOverrides = 1, overrides = {}) {
        const blueprint = ENTITY_DEFINITIONS[entityId];
        
        if (!blueprint) {
            console.error(`EntityFactory Error: ID '${entityId}' not found in definitions.`);
            return null;
        }

        // --- NEW: Smart Parameter Parsing ---
        // Allows calling create("WOLF", 5) OR create("WOLF", { name: "Alpha" })
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

        // 2. Apply Identity Overrides (Renamed to match EntityDefinitions)
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

        // Merge custom injected abilities
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

        if (finalOverrides.equipment) {
            config.equipment = { ...config.equipment, ...finalOverrides.equipment };
        }
        if (!config.equipment) config.equipment = {}; 

        if (finalOverrides.traits) {
            config.traits = finalOverrides.traits;
        } else if (!config.traits) {
            config.traits = []; 
        }

        // --- PROGRESSION LOGIC ---
        // Prioritize explicit level parameter, fallback to overrides, fallback to blueprint
        config.level = finalOverrides.level ?? level;

        if (finalOverrides.maxXp) {
            config.maxXp = finalOverrides.maxXp;
        } else {
            config.maxXp = ExperienceSystem.getMaxXP(config.level);
        }

        config.xp = finalOverrides.xp ?? config.xp ?? 0;
        config.skillPoints = finalOverrides.skillPoints ?? config.skillPoints ?? 0;

        // Apply automatic level scaling based on 1-to-1 attribute points
        this._applyLevelScaling(config, config.level);

        // 4. Initialize Unique ID
        config.id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 5. Create the Entity Model
        const entity = new EntityModel(config);

        // Ensure reward data survives instantiation
        if (config.lootTable) entity.lootTable = config.lootTable;
        if (config.currencyReward) entity.currencyReward = config.currencyReward;
        if (config.xpReward) entity.xpReward = config.xpReward;

        // 6. Fill Resources (Start at max health/stamina)
        entity.hp = entity.maxHp; 
        entity.stamina = entity.maxStamina;
        entity.insight = entity.maxInsight;
        
        config.isDead = false;

        return entity;
    }

    /**
     * Dynamically scales enemy attributes and currency based on their level.
     * Derived stats (HP, Damage, Defense) are handled naturally by the StatCalculator.
     */
    static _applyLevelScaling(config, level) {
        const levelDiff = level - 1;
        
        // 1 point per level to match the player
        const totalPointsToDistribute = levelDiff * 1; 

        if (config.attributes && totalPointsToDistribute > 0) {
            // Sort attributes from highest to lowest based on their blueprint
            const sortedAttributes = Object.keys(config.attributes).sort(
                (a, b) => config.attributes[b] - config.attributes[a]
            );

            // Distribute 1 point at a time, prioritizing their highest stats
            for (let i = 0; i < totalPointsToDistribute; i++) {
                const attrToBoost = sortedAttributes[i % sortedAttributes.length];
                config.attributes[attrToBoost] += 1;
            }
        }

        // Base Stat Scaling (Minor Tweaks to keep early game enemies from being one-shot)
        if (config.baseStats) {
            config.baseStats.maxHp += (levelDiff * 2); 
        }

        // Currency Scaling
        if (config.currencyReward) {
            config.currencyReward.min += Math.floor(levelDiff * 1.5);
            config.currencyReward.max += Math.floor(levelDiff * 3.5);
        }
        
        // Optionally scale base XP rewards so higher level enemies drop more XP!
        if (config.xpReward) {
             config.xpReward = Math.floor(config.xpReward * Math.pow(1.1, levelDiff));
        }
    }
}