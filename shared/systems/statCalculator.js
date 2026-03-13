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
            accuracy: 100, evasion: 100, 
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
        
        // --- STEP 1: BASE ENTITY & SECONDARY STATS ---
        const baseSource = character.baseStats || definition.stats || {};
        breakdown.resources.base.hp = baseSource.maxHp || baseSource.hp || 10;
        breakdown.resources.base.stamina = baseSource.maxStamina || baseSource.stamina || 10;
        breakdown.resources.base.insight = baseSource.maxInsight || baseSource.insight || 0;

        finalStats.hpRecovery = baseSource.hpRecovery || 0;
        finalStats.staminaRecovery = baseSource.staminaRecovery || 0;
        finalStats.insightRecovery = baseSource.insightRecovery || 0;

        const combatSource = character.baseStats || definition.baseStats || {};
        finalStats.speed = combatSource.speed || 0;
        finalStats.critChance = combatSource.critical || 0;
        
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

        Object.values(equipment).forEach(item => { if (item) mergeAttributes(item.definition || item); });
        traitIds.forEach(tid => {
            const def = TRAIT_DEFINITIONS[tid];
            if (def) mergeAttributes(def); 
        });

        Object.assign(finalStats, activeAttributes);

        // --- STEP 3: DERIVED SCALING (SYMMETRICAL & BALANCED) ---

        // 1. Vitality Pillar (Vigor handles HP and MODERATED Defense)
        breakdown.resources.derived.hp = (finalStats.vigor * 3);

        // +0.5 Defense per Vigor point (Calculated as a floor of total points)
        const vigorDefense = Math.floor(finalStats.vigor * 0.5);
        this.DAMAGE_TYPES.forEach(t => {
            finalStats.defense[t] += vigorDefense;
        });

        // 2. Physical Pillar (Power vs. Engine)
        // Strength = Damage
        finalStats.attack.blunt  += finalStats.strength;
        finalStats.attack.slash  += finalStats.strength;
        finalStats.attack.pierce += finalStats.strength;

        // Dexterity = Stamina
        breakdown.resources.derived.stamina = (finalStats.dexterity * 2);
        finalStats.staminaRecovery += finalStats.dexterity;

        // 3. Magical Pillar (Power vs. Engine)
        // Intelligence = Damage (All non-physical / Insight types)
        const physicalTypes = ["blunt", "slash", "pierce"];
        this.DAMAGE_TYPES.forEach(t => {
            if (!physicalTypes.includes(t)) {
                finalStats.attack[t] += finalStats.intelligence;
            }
        });

        // Attunement = Insight
        breakdown.resources.derived.insight = (finalStats.attunement * 2);
        finalStats.insightRecovery += finalStats.attunement;

        // --- STEP 4: FLAT BONUSES & TRAITS ---
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
        };

        Object.values(equipment).forEach(item => { if (item) applyFlat(item.definition || item); });

        const currentHp = character.hp ?? character.state?.stats?.hp ?? breakdown.resources.base.hp;
        const currentMaxHp = breakdown.resources.base.hp + breakdown.resources.derived.hp + breakdown.resources.flat.hp; 

        traitIds.forEach(tid => {
            const def = TRAIT_DEFINITIONS[tid];
            if (def?.stats) applyFlat(def.stats);
            if (def?.conditionalStats && this.checkCondition(def.conditionalStats.condition, currentHp, currentMaxHp)) {
                applyFlat(def.conditionalStats.stats);
            }
        });

        // --- STEP 5: FINAL SUMMATION ---
        finalStats.maxHp = breakdown.resources.base.hp + breakdown.resources.derived.hp + breakdown.resources.flat.hp;
        finalStats.maxStamina = breakdown.resources.base.stamina + breakdown.resources.derived.stamina + breakdown.resources.flat.stamina;
        finalStats.maxInsight = breakdown.resources.base.insight + breakdown.resources.derived.insight + breakdown.resources.flat.insight;

        finalStats.evasion = Math.max(1, finalStats.evasion);
        finalStats.accuracy = Math.max(1, finalStats.accuracy);

        return { finalStats, breakdown };
    }

    static applyModifiers(stats, source) {
        const map = { attack: 'attack', defense: 'defense', resistance: 'resistance' };
        Object.keys(map).forEach(k => {
            if (source[k] && typeof source[k] === 'object') {
                for (const [type, val] of Object.entries(source[k])) {
                    if (stats[map[k]][type] !== undefined) stats[map[k]][type] += val;
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