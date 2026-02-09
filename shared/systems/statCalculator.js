/**
 * shared/logic/StatCalculator.js
 */
import { TRAIT_DEFINITIONS } from '../../shared/data/traitDefinitions.js';
import { DAMAGE_TYPES } from '../../shared/data/constants.js';

export class StatCalculator {

    static get DAMAGE_TYPES() { return DAMAGE_TYPES || ['blunt', 'slash', 'pierce', 'fire', 'ice', 'lightning', 'dark', 'light']; }

    static calculate(character) {
        const details = this._runPipeline(character);
        return details.finalStats;
    }

    static calculateDetailed(character) {
        const { finalStats, breakdown } = this._runPipeline(character);
        
        return {
            attributes: finalStats,
            maxHp: { 
                base: breakdown.resources.base.hp + breakdown.resources.derived.hp, 
                bonus: breakdown.resources.flat.hp, 
                total: finalStats.maxHp 
            },
            maxStamina: { 
                base: breakdown.resources.base.stamina + breakdown.resources.derived.stamina, 
                bonus: breakdown.resources.flat.stamina, 
                total: finalStats.maxStamina 
            },
            maxInsight: { 
                base: breakdown.resources.base.insight + breakdown.resources.derived.insight, 
                bonus: breakdown.resources.flat.insight, 
                total: finalStats.maxInsight 
            },
            // Pass through combat stats for the UI
            attack: finalStats.attack,
            defense: finalStats.defense,
            resistance: finalStats.resistance,
            speed: finalStats.speed,
            critChance: finalStats.critChance
        };
    }

    static _runPipeline(character) {
        const finalStats = {
            attack: {}, defense: {}, resistance: {},
            vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0,
            speed: 0, critChance: 0, critMultiplier: 1.5,
            maxHp: 0, maxStamina: 0, maxInsight: 0
        };

        this.DAMAGE_TYPES.forEach(t => {
            finalStats.attack[t] = 0; 
            finalStats.defense[t] = 0; 
            finalStats.resistance[t] = 0;
        });

        const breakdown = {
            resources: {
                base: { hp: 0, stamina: 0, insight: 0 },
                derived: { hp: 0, stamina: 0, insight: 0 },
                flat: { hp: 0, stamina: 0, insight: 0 }
            }
        };

        if (!character) return { finalStats, breakdown };

        // [FIX]: Safe fallback if 'definition' doesn't exist on EntityModel
        const definition = character.definition || {}; 
        
        // --- STEP 1: BASE ENTITY ---
        // [FIX]: specific checks for EntityModel getters (character.baseStats)
        const baseSource = character.baseStats || definition.stats || {};
        
        breakdown.resources.base.hp = baseSource.maxHp || baseSource.hp || 10;
        breakdown.resources.base.stamina = baseSource.maxStamina || baseSource.stamina || 10;
        breakdown.resources.base.insight = baseSource.maxInsight || baseSource.insight || 0;

        const combatSource = character.baseStats || definition.baseStats || {};
        finalStats.speed = combatSource.speed || 0;
        finalStats.critChance = (combatSource.critical || 0) * 0.01;

        if (combatSource.baseDefense) this.DAMAGE_TYPES.forEach(t => finalStats.defense[t] = combatSource.baseDefense[t] || 0);
        if (combatSource.baseAttack) this.DAMAGE_TYPES.forEach(t => finalStats.attack[t] = combatSource.baseAttack[t] || 0);

        // --- STEP 2: CALCULATE ATTRIBUTES ---
        // [FIX]: specific check for EntityModel getter (character.attributes)
        const activeAttributes = { ...(character.attributes || {}) }; 
        
        // [FIX]: EntityModel getter 'equipment' returns { slot: ItemModel }
        const equipment = character.equipment || character.state?.equipment || {};
        const traitIds = character.traits || character.state?.traits || [];

        const mergeAttributes = (source) => {
            if (!source?.attributes) return;
            for (const [key, val] of Object.entries(source.attributes)) {
                activeAttributes[key] = (activeAttributes[key] || 0) + val;
            }
        };

        Object.values(equipment).forEach(item => {
            // [FIX]: ItemModel might be the source itself, or contain a definition
            if (item) mergeAttributes(item.definition || item);
        });

        traitIds.forEach(tid => {
            const def = TRAIT_DEFINITIONS[tid];
            if (def) mergeAttributes(def); 
        });

        Object.assign(finalStats, activeAttributes);

        // --- STEP 3: DERIVED RESOURCES ---
        
        // Vigor -> HP/Stamina
        breakdown.resources.derived.hp = (finalStats.vigor * 5);
        breakdown.resources.derived.stamina = (finalStats.vigor * 2);
        
        // Attunement -> Insight
        breakdown.resources.derived.insight = (finalStats.attunement * 2);

        // Attributes -> Combat Stats
        const str = finalStats.strength;
        finalStats.attack.blunt  += str;
        finalStats.attack.slash  += str;
        finalStats.attack.pierce += str;
        
        // Defense scaling
        finalStats.defense.blunt  += Math.floor(str * 0.5);
        finalStats.defense.slash  += Math.floor(str * 0.5);
        finalStats.defense.pierce += Math.floor(str * 0.5);

        // Dexterity
        finalStats.speed += finalStats.dexterity;
        finalStats.critChance += (finalStats.dexterity * 0.01);

        // Intelligence
        const physicalTypes = ["blunt", "slash", "pierce"];
        this.DAMAGE_TYPES.forEach(type => {
            if (!physicalTypes.includes(type)) {
                finalStats.attack[type] += finalStats.intelligence;
                finalStats.resistance[type] += Math.floor(finalStats.intelligence * 0.5);
            }
        });

        // --- STEP 4: FLAT BONUSES ---
        
        const applyFlat = (source) => {
            this.applyModifiers(finalStats, source); // Helper method below

            if (source.resources) {
                if (source.resources.maxHp) breakdown.resources.flat.hp += source.resources.maxHp;
                if (source.resources.maxStamina) breakdown.resources.flat.stamina += source.resources.maxStamina;
                if (source.resources.maxInsight) breakdown.resources.flat.insight += source.resources.maxInsight;
            }
            if (source.maxHp) breakdown.resources.flat.hp += source.maxHp;
        };

        Object.values(equipment).forEach(item => {
            if (item) applyFlat(item.definition || item);
        });

        // [FIX]: Get current HP safely from EntityModel OR State
        const currentHp = character.hp ?? character.state?.stats?.hp ?? breakdown.resources.base.hp;
        const currentMaxHp = breakdown.resources.base.hp + breakdown.resources.derived.hp; 

        traitIds.forEach(tid => {
            const def = TRAIT_DEFINITIONS[tid];
            if (!def) return;
            
            if (def.stats) applyFlat(def.stats);
            
            if (def.conditionalStats && this.checkCondition(def.conditionalStats.condition, currentHp, currentMaxHp)) {
                applyFlat(def.conditionalStats.stats);
            }
        });

        // --- FINAL SUMMATION ---
        finalStats.maxHp = breakdown.resources.base.hp + breakdown.resources.derived.hp + breakdown.resources.flat.hp;
        finalStats.maxStamina = breakdown.resources.base.stamina + breakdown.resources.derived.stamina + breakdown.resources.flat.stamina;
        finalStats.maxInsight = breakdown.resources.base.insight + breakdown.resources.derived.insight + breakdown.resources.flat.insight;

        return { finalStats, breakdown };
    }

    static applyModifiers(stats, source) {
        const map = { attack: 'attack', defense: 'defense', resistance: 'resistance' };
        
        Object.keys(map).forEach(k => {
            if (source[k]) {
                const targetKey = map[k];
                // Handle both object { blunt: 5 } and flat numbers (if simplified)
                if (typeof source[k] === 'object') {
                    for (const [type, val] of Object.entries(source[k])) {
                         if (stats[targetKey][type] !== undefined) stats[targetKey][type] += val;
                    }
                }
            }
        });

        if (source.combat) {
            if (source.combat.speed) stats.speed += source.combat.speed;
            if (source.combat.critChance) stats.critChance += source.combat.critChance;
            if (source.combat.critMultiplier) stats.critMultiplier += source.combat.critMultiplier;
        }
        
        // Legacy flat defense handling
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