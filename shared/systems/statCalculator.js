import { TRAIT_DEFINITIONS } from '../../shared/data/traitDefinitions.js';
import { DAMAGE_TYPES } from '../../shared/data/constants.js';

export class StatCalculator {

    static get DAMAGE_TYPES() { 
        return DAMAGE_TYPES || [ 
            "blunt", "slash", "pierce", 
            "fire", "ice", "lightning", "water", "earth", "wind", 
            "light", "dark", "arcane" 
        ];
    }

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
            hpRecovery: finalStats.hpRecovery,
            staminaRecovery: finalStats.staminaRecovery,
            insightRecovery: finalStats.insightRecovery,

            attack: finalStats.attack,
            defense: finalStats.defense,
            resistance: finalStats.resistance,
            speed: finalStats.speed,
            critChance: finalStats.critChance,
            accuracy: finalStats.accuracy, 
            evasion: finalStats.evasion    
        };
    }

    static _runPipeline(character) {
        const finalStats = {
            attack: {}, defense: {}, resistance: {},
            vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0,
            speed: 0, critChance: 0, critMultiplier: 1.5,
            accuracy: 100, evasion: 100, // STANDARDIZED: Base 100 for entity hit math
            maxHp: 0, maxStamina: 0, maxInsight: 0,
            hpRecovery: 0, staminaRecovery: 0, insightRecovery: 0 
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

        const definition = character.definition || {}; 
        
        // --- PRE-STEP: EXTRACT STATUS EFFECTS ---
        const statusFlat = {};
        const statusPercent = {};
        const activeEffects = character.statusEffects || character.state?.statusEffects || [];

        activeEffects.forEach(effect => {
            if (effect.modifiers) {
                effect.modifiers.forEach(mod => {
                    if (mod.type === 'flat') {
                        statusFlat[mod.target] = (statusFlat[mod.target] || 0) + mod.value;
                    } else if (mod.type === 'percent') {
                        // Aggregate percentages additively (e.g., +50% and -20% = 1.3 net multiplier)
                        statusPercent[mod.target] = (statusPercent[mod.target] || 1) + mod.value;
                    }
                });
            }
        });
        
        // --- STEP 1: BASE ENTITY ---
        const baseSource = character.baseStats || definition.stats || {};
        
        breakdown.resources.base.hp = baseSource.maxHp || baseSource.hp || 10;
        breakdown.resources.base.stamina = baseSource.maxStamina || baseSource.stamina || 10;
        breakdown.resources.base.insight = baseSource.maxInsight || baseSource.insight || 0;

        finalStats.hpRecovery = baseSource.hpRecovery || 0;
        finalStats.staminaRecovery = baseSource.staminaRecovery || 0;
        finalStats.insightRecovery = baseSource.insightRecovery || 0;

        const combatSource = character.baseStats || definition.baseStats || {};
        finalStats.speed = combatSource.speed || 0;
        finalStats.critChance = (combatSource.critical || 0) * 0.01;
        
        if (combatSource.accuracy !== undefined) finalStats.accuracy = combatSource.accuracy;
        if (combatSource.evasion !== undefined) finalStats.evasion = combatSource.evasion;

        if (combatSource.baseDefense) this.DAMAGE_TYPES.forEach(t => finalStats.defense[t] = combatSource.baseDefense[t] || 0);
        if (combatSource.baseAttack) this.DAMAGE_TYPES.forEach(t => finalStats.attack[t] = combatSource.baseAttack[t] || 0);
        if (combatSource.baseResistance) this.DAMAGE_TYPES.forEach(t => finalStats.resistance[t] = combatSource.baseResistance[t] || 0);

        // --- STEP 2: CALCULATE ATTRIBUTES ---
        const activeAttributes = { ...(character.attributes || {}) }; 
        const equipment = character.equipment || character.state?.equipment || {};
        const traitIds = character.traits || character.state?.traits || [];

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
            if (def) mergeAttributes(def); 
        });

        // -> Apply Flat Status Buffs to Attributes
        ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'].forEach(attr => {
            if (statusFlat[attr]) activeAttributes[attr] = (activeAttributes[attr] || 0) + statusFlat[attr];
        });

        Object.assign(finalStats, activeAttributes);

        // -> Apply Percent Status Buffs to Attributes (Done before derived stats so damage scales up!)
        ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'].forEach(attr => {
            if (statusPercent[attr]) finalStats[attr] = Math.max(1, Math.round(finalStats[attr] * statusPercent[attr]));
        });


        // --- STEP 3: DERIVED RESOURCES ---
        breakdown.resources.derived.hp = (finalStats.vigor * 3);
        breakdown.resources.derived.stamina = (finalStats.vigor * 3);
        breakdown.resources.derived.insight = (finalStats.attunement * 3);

        const str = finalStats.strength;
        finalStats.attack.blunt  += str;
        finalStats.attack.slash  += str;
        finalStats.attack.pierce += str;
        
        finalStats.defense.blunt  += Math.floor(str * 0.5);
        finalStats.defense.slash  += Math.floor(str * 0.5);
        finalStats.defense.pierce += Math.floor(str * 0.5);

        finalStats.speed += finalStats.dexterity;
        finalStats.critChance += (finalStats.dexterity * 0.01);

        const physicalTypes = ["blunt", "slash", "pierce"];
        this.DAMAGE_TYPES.forEach(type => {
            if (!physicalTypes.includes(type)) {
                finalStats.attack[type] += finalStats.intelligence;
                finalStats.resistance[type] += (finalStats.intelligence * 0.01);
            }
        });

        // --- STEP 4: FLAT BONUSES ---
        const applyFlat = (source) => {
            this.applyModifiers(finalStats, source); 

            if (source.resources) {
                if (source.resources.maxHp) breakdown.resources.flat.hp += source.resources.maxHp;
                if (source.resources.maxStamina) breakdown.resources.flat.stamina += source.resources.maxStamina;
                if (source.resources.maxInsight) breakdown.resources.flat.insight += source.resources.maxInsight;
                
                if (source.resources.hpRecovery) finalStats.hpRecovery += source.resources.hpRecovery;
                if (source.resources.staminaRecovery) finalStats.staminaRecovery += source.resources.staminaRecovery;
                if (source.resources.insightRecovery) finalStats.insightRecovery += source.resources.insightRecovery;
            }
            if (source.maxHp) breakdown.resources.flat.hp += source.maxHp;
            
            if (source.hpRecovery) finalStats.hpRecovery += source.hpRecovery;
            if (source.staminaRecovery) finalStats.staminaRecovery += source.staminaRecovery;
            if (source.insightRecovery) finalStats.insightRecovery += source.insightRecovery;
        };

        Object.values(equipment).forEach(item => {
            if (item) applyFlat(item.definition || item);
        });

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

        // --- STEP 5: FINAL SUMMATION ---
        finalStats.maxHp = breakdown.resources.base.hp + breakdown.resources.derived.hp + breakdown.resources.flat.hp;
        finalStats.maxStamina = breakdown.resources.base.stamina + breakdown.resources.derived.stamina + breakdown.resources.flat.stamina;
        finalStats.maxInsight = breakdown.resources.base.insight + breakdown.resources.derived.insight + breakdown.resources.flat.insight;

        // -> Apply Flat Combat Status Modifiers (e.g. +20 accuracy)
        Object.keys(statusFlat).forEach(target => {
            if (!['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'].includes(target)) {
                if (typeof finalStats[target] === 'number') {
                    finalStats[target] += statusFlat[target];
                }
            }
        });

        // -> Apply Percent Combat Status Modifiers (e.g. -50% evasion)
        Object.keys(statusPercent).forEach(target => {
            if (!['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'].includes(target)) {
                if (typeof finalStats[target] === 'number') {
                    // Do not floor decimal-based stats like critChance
                    if (['critChance', 'critMultiplier'].includes(target)) {
                        finalStats[target] *= statusPercent[target];
                    } else {
                        finalStats[target] = Math.round(finalStats[target] * statusPercent[target]);
                    }
                }
            }
        });

        // --- STEP 6: CLAMPING & SAFETY ---
        // This is crucial: It prevents division-by-zero in your ratio-based hit chance formula 
        // if a debuff ever pushes evasion to 0 or below.
        finalStats.evasion = Math.max(1, finalStats.evasion);
        finalStats.accuracy = Math.max(1, finalStats.accuracy);

        return { finalStats, breakdown };
    }

    static applyModifiers(stats, source) {
        const map = { attack: 'attack', defense: 'defense', resistance: 'resistance' };
        
        Object.keys(map).forEach(k => {
            if (source[k]) {
                const targetKey = map[k];
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
            if (source.combat.accuracy) stats.accuracy += source.combat.accuracy;
            if (source.combat.evasion) stats.evasion += source.combat.evasion;
        }
        
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