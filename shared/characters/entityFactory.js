// =========================================================================
// 3. entityFactory.js
// =========================================================================
import { ENTITY_DEFINITIONS } from './entityDefinitions.js';
import { EntityModel } from './entityModel.js';
import { ExperienceSystem } from './experienceSystem.js';
import { DAMAGE_SCALING, scalingFor } from '../core/constants.js';
import { ItemDefinitions } from '../items/itemDefinitions.js';

// BALANCE KNOB: extra base max HP an entity gets per level above 1, ON TOP of the +2 per level that every level-up gives (ExperienceSystem.applyLevelUpStats).
// This is what makes same-level enemies slightly tougher than a player who has no gear or upgrades yet. 0 = no edge, 0.5 = +2.5 HP per level in total.
// The bonus is recorded on the entity (levelEdgeHp) so EntityFactory.removeLevelEdge() can take it away again when an enemy joins the party.
const LEVEL_EDGE_HP_PER_LEVEL = 0.5;

// BALANCE KNOB: extra points an enemy gets per level above 1 in the attribute its best attack scales with (Strength for blunt, Dexterity for pierce,
// the higher of the two for slash, Attunement for the elements, Intelligence for light, dark and arcane: core/constants.js DAMAGE_SCALING), ON TOP of the 1 point per level spread over every attribute. Player defense grows
// with level and Vigor while an enemy's attack used to stay almost flat, so late fights got easier; this keeps an enemy's hits growing with its level.
// 1.5 = +1.5 attack per level (about +10 at level 8, +16 at level 12); 0 switches it off. Like the HP edge, it is recorded on the entity (levelEdgeAttr) and EntityFactory.removeLevelEdge() takes it away on recruit.
const LEVEL_EDGE_ATTACK_PER_LEVEL = 1.5;

export class EntityFactory {
    static create(entityId, levelOrOverrides = 1, overrides = {}) {
        const blueprint = ENTITY_DEFINITIONS[entityId];
        if (!blueprint) {
            console.error(`EntityFactory Error: ID '${entityId}' not found in definitions.`);
            return null;
        }

        let level = 1;
        let finalOverrides = overrides;

        if (typeof levelOrOverrides === 'object') {
            finalOverrides = levelOrOverrides;
            level = finalOverrides.level || blueprint.level || 1;
        } else {
            level = levelOrOverrides;
        }

        const config = structuredClone(blueprint);

        // ---> FIX: Preserve the original template definition key <---
        config.templateId = entityId;
        config.definitionKey = entityId;

        if (finalOverrides.name) config.name = finalOverrides.name;
        if (finalOverrides.spriteOverworld) config.spriteOverworld = finalOverrides.spriteOverworld;
        if (finalOverrides.spritePortrait) config.spritePortrait = finalOverrides.spritePortrait;
        if (finalOverrides.frameSize !== undefined) config.frameSize = finalOverrides.frameSize;
        if (finalOverrides.crySound) config.crySound = finalOverrides.crySound;
        if (finalOverrides.deathSound) config.deathSound = finalOverrides.deathSound;
        if (finalOverrides.battlePortraitFramesFront !== undefined) config.battlePortraitFramesFront = finalOverrides.battlePortraitFramesFront;
        if (finalOverrides.battlePortraitFramesBack !== undefined) config.battlePortraitFramesBack = finalOverrides.battlePortraitFramesBack;

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

        if (finalOverrides.equipment) {
            config.equipment = { ...config.equipment, ...finalOverrides.equipment };
        }

        if (!config.equipment) config.equipment = {};
        if (!config.traits) config.traits = [];

        if (finalOverrides.traits && Array.isArray(finalOverrides.traits)) {
            config.traits.push(...finalOverrides.traits);
            config.traits = [...new Set(config.traits)];
        }

        if (!config.statusEffects) config.statusEffects = [];
        if (finalOverrides.statusEffects && Array.isArray(finalOverrides.statusEffects)) {
            config.statusEffects.push(...finalOverrides.statusEffects);
        }

        config.level = finalOverrides.level ?? level;
        
        if (finalOverrides.maxXp) {
            config.maxXp = finalOverrides.maxXp;
        } else {
            config.maxXp = ExperienceSystem.getMaxXP(config.level);
        }

        config.xp = finalOverrides.xp ?? config.xp ?? 0;
        config.skillPoints = finalOverrides.skillPoints ?? config.skillPoints ?? 0;

        // Pass levelEdge: false in the overrides to create a leveled entity without the enemy HP edge (e.g. a pre-made ally).
        this._applyLevelScaling(config, config.level, finalOverrides.levelEdge !== false);

        config.id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const entity = new EntityModel(config);

        // ---> FIX: Attach template properties to the instantiated model <---
        entity.templateId = entityId;
        entity.definitionKey = entityId;

        if (config.lootTableId) entity.state.lootTableId = config.lootTableId;
        if (config.currencyReward) entity.currencyReward = config.currencyReward;
        if (config.xpReward) entity.xpReward = config.xpReward;

        entity.hp = finalOverrides.startingHpPercent !== undefined 
            ? Math.floor(entity.maxHp * finalOverrides.startingHpPercent) 
            : entity.maxHp;

        entity.stamina = finalOverrides.startingStaminaPercent !== undefined 
            ? Math.floor(entity.maxStamina * finalOverrides.startingStaminaPercent) 
            : entity.maxStamina;

        entity.insight = finalOverrides.startingInsightPercent !== undefined 
            ? Math.floor(entity.maxInsight * finalOverrides.startingInsightPercent) 
            : entity.maxInsight;

        config.isDead = false;

        return entity;
    }

    static _applyLevelScaling(config, level, applyEdge = true) {
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

        const mainAttr = applyEdge ? this._mainAttackAttribute(config) : null;
        if (mainAttr && levelDiff > 0 && LEVEL_EDGE_ATTACK_PER_LEVEL > 0) {
            const bonus = Math.floor(levelDiff * LEVEL_EDGE_ATTACK_PER_LEVEL);
            config.attributes[mainAttr] += bonus;
            config.levelEdgeAttr = { attribute: mainAttr, amount: bonus };
        }

        if (config.baseStats) {
            config.baseStats.maxHp += (levelDiff * 2);

            const edge = applyEdge ? Math.floor(levelDiff * LEVEL_EDGE_HP_PER_LEVEL) : 0;
            if (edge > 0) {
                config.baseStats.maxHp += edge;
                config.levelEdgeHp = edge; // stored in the entity state, so it is saved and can be removed on recruit
            }
        }

        if (config.currencyReward) {
            config.currencyReward.min += Math.floor(levelDiff * 1.5);
            config.currencyReward.max += Math.floor(levelDiff * 3.5);
        }

        if (config.xpReward) {
            config.xpReward = Math.floor(config.xpReward * Math.pow(1.1, levelDiff));
        }
    }

    /** The attribute an entity's strongest attack scales with (its base attack, its attributes and its weapon decide which attack that is), or null. */
    static _mainAttackAttribute(config) {
        if (!config.attributes) return null;
        const weapon = {};
        for (const slot of ['mainHand', 'oneHand', 'twoHand']) {
            const eq = config.equipment && config.equipment[slot];
            const def = eq && ItemDefinitions[typeof eq === 'string' ? eq : (eq.defId || eq.id)];
            if (def && def.attack) for (const [t, v] of Object.entries(def.attack)) weapon[t] = (weapon[t] || 0) + v;
        }
        let best = null;
        for (const type of Object.keys(DAMAGE_SCALING)) {
            const { value, attr } = scalingFor(type, config.attributes);
            const total = (config.baseStats?.baseAttack?.[type] || 0) + (weapon[type] || 0) + value;
            if (attr && (!best || total > best.total)) best = { total, attr };
        }
        return best ? best.attr : null;
    }

    // Call this when an enemy joins the party: removes the enemy-only level HP bonus so an ally is exactly as tough as a player-built
    // character of the same level. Safe to call on any entity (does nothing if it has no bonus) and safe to call twice.
    static removeLevelEdge(entity) {
        const edge = entity?.state?.levelEdgeHp || 0;
        const edgeAttr = entity?.state?.levelEdgeAttr;
        if (edgeAttr && edgeAttr.amount > 0 && entity.state.attributes) {
            entity.state.attributes[edgeAttr.attribute] = Math.max(1, (entity.state.attributes[edgeAttr.attribute] || 0) - edgeAttr.amount);
            entity.state.levelEdgeAttr = null;
        }
        if (edge <= 0) return !!edgeAttr;

        entity.state.baseStats.maxHp = Math.max(1, entity.state.baseStats.maxHp - edge);
        entity.state.levelEdgeHp = 0;
        if (entity.hp > entity.maxHp) entity.hp = entity.maxHp; // the hp setter already clamps to maxHp
        return true;
    }
}