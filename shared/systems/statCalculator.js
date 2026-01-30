import { TRAIT_DEFINITIONS } from '../../shared/data/traitDefinitions.js';
import { DAMAGE_TYPES } from '../../shared/data/constants.js';

export class StatCalculator {

    static get DAMAGE_TYPES() { return DAMAGE_TYPES || ['blunt', 'slash', 'pierce', 'fire', 'ice', 'lightning', 'dark', 'light']; }

    static calculate(character) {
        // --- 1. INITIALIZE SAFE DEFAULTS ---
        // We do this BEFORE checking if character exists, so we never return an empty object.
        const stats = {
            attack: {}, defense: {}, resistance: {},
            vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0,
            speed: 0, critChance: 0, critMultiplier: 1.5,
            maxHp: 10, maxStamina: 10, maxInsight: 0
        };

        // Populate Damage Type Maps (prevents "cannot read property 'blunt' of undefined")
        this.DAMAGE_TYPES.forEach(t => {
            stats.attack[t] = 0; 
            stats.defense[t] = 0; 
            stats.resistance[t] = 0;
        });

        // If no character is provided (e.g., empty party slot), return the zeroed stats immediately.
        if (!character) return stats;

        // --- 2. IDENTIFY SOURCES OF TRUTH ---
        const definition = character.definition || {};
        const isRawObject = character.constructor === Object;
        
        const baseSource = definition.stats 
            || character.baseStats 
            || (isRawObject ? character.stats : null)
            || {};

        const combatSource = definition.baseStats 
            || character.baseStats 
            || (isRawObject ? character.baseStats : null) 
            || {};

        // --- 3. APPLY BASELINE (Species/Class Defaults) ---
        stats.maxHp = baseSource.maxHp || baseSource.hp || 10;
        stats.maxStamina = baseSource.maxStamina || baseSource.stamina || 10;
        stats.maxInsight = baseSource.maxInsight || baseSource.insight || 0;

        stats.speed = combatSource.speed || 0;
        stats.critChance = (combatSource.critical || 0) * 0.01;

        if (combatSource.baseDefense) {
            this.DAMAGE_TYPES.forEach(t => stats.defense[t] = combatSource.baseDefense[t] || 0);
        }
        if (combatSource.baseAttack) {
            this.DAMAGE_TYPES.forEach(t => stats.attack[t] = combatSource.baseAttack[t] || 0);
        }

        // --- 4. GATHER ATTRIBUTES ---
        const activeAttributes = { ...(character.attributes || {}) };
        const equipment = character.state?.equipment || character.equipment || {};
        const traitIds = character.state?.traits || character.traits || [];

        const mergeAttributes = (source) => {
            if (!source?.attributes) return;
            for (const [key, val] of Object.entries(source.attributes)) {
                activeAttributes[key] = (activeAttributes[key] || 0) + val;
            }
        };

        Object.values(equipment).forEach(item => {
            if (item) mergeAttributes(item.definition || item);
        });

        traitIds.forEach(tid => {
            const def = TRAIT_DEFINITIONS[tid];
            if (def) mergeAttributes(def.stats);
        });

        Object.assign(stats, activeAttributes);

        // --- 5. CALCULATE DERIVED STATS (Scaling) ---
        
        // Strength (Physical)
        const str = stats.strength;
        stats.attack.blunt  += str;
        stats.attack.slash  += str;
        stats.attack.pierce += str;
        
        stats.defense.blunt  += Math.floor(str * 0.5);
        stats.defense.slash  += Math.floor(str * 0.5);
        stats.defense.pierce += Math.floor(str * 0.5);

        // Dexterity (Speed/Crit)
        stats.speed += stats.dexterity;
        stats.critChance += (stats.dexterity * 0.01);

        // Intelligence (Magic)
        const physicalTypes = ["blunt", "slash", "pierce"];
        this.DAMAGE_TYPES.forEach(type => {
            if (!physicalTypes.includes(type)) {
                stats.attack[type] += stats.intelligence;
                stats.resistance[type] += Math.floor(stats.intelligence * 0.5);
            }
        });

        // Resources (Scaling)
        stats.maxHp += (stats.vigor * 5);
        stats.maxStamina += (stats.vigor * 2); 
        stats.maxInsight += (stats.attunement * 2);

        // --- 6. APPLY FLAT BONUSES (Equipment/Traits) ---
        Object.values(equipment).forEach(item => {
            if (item) this.applyModifiers(stats, item.definition || item);
        });

        traitIds.forEach(tid => {
            const def = TRAIT_DEFINITIONS[tid];
            if (!def) return;
            
            if (def.stats) this.applyModifiers(stats, def.stats);
            
            const currentHp = character.state?.stats?.hp || 0;
            if (def.conditionalStats && this.checkCondition(def.conditionalStats.condition, currentHp, stats.maxHp)) {
                this.applyModifiers(stats, def.conditionalStats.stats);
            }
        });

        return stats;
    }

    static applyModifiers(stats, source) {
        const map = { attack: 'attack', defense: 'defense', defense: 'defense', resistance: 'resistance' };
        
        Object.keys(map).forEach(k => {
            if (source[k]) {
                const targetKey = map[k];
                for (const [type, val] of Object.entries(source[k])) {
                    if (stats[targetKey][type] !== undefined) stats[targetKey][type] += val;
                }
            }
        });

        if (source.combat) {
            if (source.combat.speed) stats.speed += source.combat.speed;
            if (source.combat.critChance) stats.critChance += source.combat.critChance;
            if (source.combat.critMultiplier) stats.critMultiplier += source.combat.critMultiplier;
        }

        if (source.resources) {
            if (source.resources.maxHp) stats.maxHp += source.resources.maxHp;
            if (source.resources.maxStamina) stats.maxStamina += source.resources.maxStamina;
            if (source.resources.maxInsight) stats.maxInsight += source.resources.maxInsight;
        }

        if (source.maxHp) stats.maxHp += source.maxHp;
        if (source.defense && typeof source.defense === 'number') {
             stats.defense.blunt += source.defense;
             stats.defense.slash += source.defense;
             stats.defense.pierce += source.defense;
        }
    }

    static checkCondition(type, currentHp, maxHp) {
        if (!maxHp) maxHp = 1;
        switch (type) {
            case "hp_below_50_percent": return currentHp < (maxHp * 0.5);
            case "hp_below_30_percent": return currentHp < (maxHp * 0.3);
            case "hp_full": return currentHp >= maxHp;
            default: return false;
        }
    }
}