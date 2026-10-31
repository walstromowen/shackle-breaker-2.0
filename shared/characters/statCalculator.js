import { TRAIT_DEFINITIONS } from '../abilities/traitDefinitions.js'; 
import { DAMAGE_TYPES, CORRUPTION, MAGIC_DAMAGE_TYPES, DEFENSE_PER_SCALING_POINT, ENEMY_DAMAGE_SCALING, scalingFor } from '../core/constants.js'; 
import { ActSystem } from '../story/actSystem.js'; 
import { requirementsOf, unmetRequirements, UNMET_REQUIREMENT_DAMAGE_SCALE } from '../items/weaponRequirements.js'; 

// BALANCE KNOB: scales the HP that Vigor grants, for EVERYONE (party, enemies, bosses and already-saved characters).
// Saved characters keep their own copy of statMultipliers.hpPerVigor, so lowering it in the entity templates would not
// touch them; this applies on top of whatever hpPerVigor an entity has. 1 = unchanged, 0.5 = half the HP from Vigor.
// 1 (was 0.5): a new character's Vigor gives the full +3 max HP per point (hpPerVigor 3).
export const HP_PER_VIGOR_SCALE = 1;

// BALANCE KNOB: defense against every damage type per point of Vigor. 0 (was 0.5): Vigor now gives double the HP, and stacking a flat defense on
// top made Vigor the one attribute worth buying; defense comes from the attributes each damage type scales with instead (DEFENSE_PER_SCALING_POINT).
export const VIGOR_DEFENSE_PER_POINT = 0;

// BALANCE KNOBS: how much passive per-round recovery each point of the pool attributes grants.
// Max stamina and its recovery scale with Dexterity AND Strength, max insight and its recovery with Attunement AND Intelligence (each point of either counts;
// the max pool uses the entity's own staminaPerDex / insightPerAtt multiplier for both attributes).
// 0.25 per point of EACH attribute: since two attributes feed every pool, a character with 10 / 10 recovers what a 20-point specialist did at 0.5 (keeps
// recovery below the cost of a basic ability, so stamina and insight still matter).
// Recovery is the SUSTAIN rate and the max pool is the BURST reserve, so recovery has to grow slower than the pool
// (a point of Dex gives +2 max stamina, so 0.5 recovery is a quarter of the pool a point adds, per round, at every level).
// It used to be 1 per point, which refilled about half the pool every round and made ability costs meaningless.
// Applies to everyone (party, enemies, saved characters); gear and trait recovery bonuses are flat and added on top.
// 0.5 (was 0.35, and 0.3 before that): more sustain, so waiting for stamina or insight slows fights down less (a quarter of what a point adds to the pool, per round). It is added up before rounding (the
// old code rounded each point's share on its own), so the whole sum steps up every second point of Dexterity / Attunement.
export const STAMINA_RECOVERY_PER_DEX = 0.25;   // per point of Dexterity and per point of Strength
export const INSIGHT_RECOVERY_PER_ATT = 0.25;   // per point of Attunement and per point of Intelligence
export const STAMINA_ATTRIBUTES = ['dexterity', 'strength'];
export const INSIGHT_ATTRIBUTES = ['attunement', 'intelligence'];
const sumOf = (stats, attrs) => attrs.reduce((sum, a) => sum + (stats[a] || 0), 0);

// ENEMY RULES (see ENEMY_DAMAGE_SCALING in core/constants.js): an enemy's defense is Vigor's, +1 against everything per 2 points, and its pools come
// from Dexterity / Attunement alone, at the recovery rate it was balanced with.
const ENEMY_VIGOR_DEFENSE_PER_POINT = 0.5;
const ENEMY_RECOVERY_PER_POINT = 0.5;
const whole = (n) => Math.round(n);
const hundredths = (n) => Math.round(n * 100) / 100;

export class StatCalculator { 
    static get DAMAGE_TYPES() { 
        return DAMAGE_TYPES || [ "blunt", "slash", "pierce", "fire", "ice", "lightning", "water", "earth", "wind", "light", "dark", "arcane" ]; 
    } 

    static calculate(character, allocations = null) { 
        const details = this._runPipeline(character, allocations); 
        return details.finalStats; 
    } 

    static calculateDetailed(character, allocations = null) { 
        const { finalStats, breakdown } = this._runPipeline(character, allocations); 
        return { 
            attributes: finalStats, 
            maxHp: { base: breakdown.resources.base.hp + breakdown.resources.derived.hp, bonus: breakdown.resources.flat.hp, total: finalStats.maxHp }, 
            maxStamina: { base: breakdown.resources.base.stamina + breakdown.resources.derived.stamina, bonus: breakdown.resources.flat.stamina, total: finalStats.maxStamina }, 
            maxInsight: { base: breakdown.resources.base.insight + breakdown.resources.derived.insight, bonus: breakdown.resources.flat.insight, total: finalStats.maxInsight }, 
            hpRecovery: finalStats.hpRecovery, 
            staminaRecovery: finalStats.staminaRecovery, 
            insightRecovery: finalStats.insightRecovery, 
            attack: finalStats.attack, 
            defense: finalStats.defense, 
            resistance: finalStats.resistance, 
            speed: finalStats.speed, 
            critChance: finalStats.critChance, 
            critMultiplier: finalStats.critMultiplier, 
            accuracy: finalStats.accuracy, 
            evasion: finalStats.evasion, 
            corruption: finalStats.corruption, 
            unmetRequirements: breakdown.unmetRequirements || [] 
        }; 
    } 

    /* Does this character play by the enemy rules? Everything made from an entity template other than HUMANOID (the player and the hired
       mercenaries are HUMANOIDs): enemies, and the beasts and soldiers that join the party, which keep the numbers they were balanced with.
       A plain stat object without a template (tests, previews) uses the player's rules. */
    static usesEnemyScaling(character) {
        const id = character && (character.templateId || character.definitionKey || character.state?.templateId);
        return !!id && id !== 'HUMANOID';
    }

    static _runPipeline(character, allocations = null) { 
        const finalStats = { attack: {}, defense: {}, resistance: {}, vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0, speed: 0, critChance: 0, critMultiplier: 1.5, accuracy: 100, evasion: 100, corruption: 0, maxHp: 0, maxStamina: 0, maxInsight: 0, hpRecovery: 0, staminaRecovery: 0, insightRecovery: 0 }; 
        this.DAMAGE_TYPES.forEach(t => { finalStats.attack[t] = 0; finalStats.defense[t] = 0; finalStats.resistance[t] = 0; }); 
        
        const breakdown = { resources: { base: { hp: 0, stamina: 0, insight: 0 }, derived: { hp: 0, stamina: 0, insight: 0 }, flat: { hp: 0, stamina: 0, insight: 0 } } }; 
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
        finalStats.corruption = combatSource.corruption || 0;   // the character's own corruption (CorruptionSystem moves it); traits and gear add to it below 
        finalStats.critChance = combatSource.critical || 0; 
        if (combatSource.accuracy !== undefined) finalStats.accuracy = combatSource.accuracy; 
        if (combatSource.evasion !== undefined) finalStats.evasion = combatSource.evasion; 
        
        if (combatSource.baseDefense) this.DAMAGE_TYPES.forEach(t => finalStats.defense[t] = combatSource.baseDefense[t] || 0); 
        if (combatSource.baseAttack) this.DAMAGE_TYPES.forEach(t => finalStats.attack[t] = combatSource.baseAttack[t] || 0); 
        if (combatSource.baseResistance) this.DAMAGE_TYPES.forEach(t => finalStats.resistance[t] = combatSource.baseResistance[t] || 0); 
        
        // --- STEP 1.5: UPGRADE MERGER --- 
        const getEffectiveStats = (item) => { 
            if (!item) return null; 
            if (!item.definition) return item; 
            return { ...item.definition, ...item, attributes: item.attributes || item.definition.attributes, attack: item.attack || item.definition.attack, defense: item.defense || item.definition.defense, resistance: item.resistance || item.definition.resistance, combat: item.combat || item.definition.combat, resources: item.resources || item.definition.resources, }; 
        }; 
        
        // --- STEP 2: CALCULATE ATTRIBUTES --- 
        const activeAttributes = { ...(character.attributes || {}) }; 
        if (allocations) { 
            for (const [key, val] of Object.entries(allocations)) { 
                activeAttributes[key] = (activeAttributes[key] || 0) + val; 
            } 
        } 
        
        const equipment = character.equipment || character.state?.equipment || {}; 
        const traitList = character.traits || character.state?.traits || []; 
        const mergeAttributes = (source) => { 
            if (!source?.attributes) return; 
            for (const [key, val] of Object.entries(source.attributes)) { 
                activeAttributes[key] = (activeAttributes[key] || 0) + val; 
            } 
        }; 
        
        Object.values(equipment).forEach(item => { if (item) mergeAttributes(getEffectiveStats(item)); }); 
        traitList.forEach(trait => { 
            const def = typeof trait === 'string' ? TRAIT_DEFINITIONS[trait] : trait; 
            if (def) mergeAttributes(def); 
        }); 
        
        Object.assign(finalStats, activeAttributes); 
        
        // --- STEP 3: DERIVED SCALING --- 
        const mults = character.statMultipliers || character.state?.statMultipliers || { hpPerVigor: 3, staminaPerDex: 2, insightPerAtt: 2 }; 
        const charLevel = character.level || 1; 
        const levelDefenseBonus = Math.floor(charLevel * 0.5); 
        
        // Vitality Pillar
        breakdown.resources.derived.hp = Math.floor(finalStats.vigor * mults.hpPerVigor * HP_PER_VIGOR_SCALE); 
        // Vigor is health, not armour: defense comes from the attributes each damage type scales with (below) and from level. 
        const enemyRules = this.usesEnemyScaling(character); 
        const vigorDefense = Math.floor(finalStats.vigor * (enemyRules ? ENEMY_VIGOR_DEFENSE_PER_POINT : VIGOR_DEFENSE_PER_POINT)); 
        this.DAMAGE_TYPES.forEach(t => { finalStats.defense[t] += vigorDefense + levelDefenseBonus; }); 
        
        // Attack and defense: each damage type scales with the attributes DAMAGE_SCALING (core/constants.js) names: Strength for blunt, Dexterity for pierce,
        // the higher of Strength or Dexterity for slash, Attunement for the six elements and Intelligence for light, dark and arcane.
        this.DAMAGE_TYPES.forEach(t => { 
            if (enemyRules) { finalStats.attack[t] += scalingFor(t, finalStats, ENEMY_DAMAGE_SCALING).value; return; } 
            const { value } = scalingFor(t, finalStats); 
            finalStats.attack[t] += value; 
            finalStats.defense[t] += value * DEFENSE_PER_SCALING_POINT; 
        }); 

        // Physical Pillar 
        const staminaAttrs = enemyRules ? ['dexterity'] : STAMINA_ATTRIBUTES; 
        breakdown.resources.derived.stamina = Math.floor(sumOf(finalStats, staminaAttrs) * mults.staminaPerDex); 
        finalStats.staminaRecovery += sumOf(finalStats, staminaAttrs) * (enemyRules ? ENEMY_RECOVERY_PER_POINT : STAMINA_RECOVERY_PER_DEX); 
        
        // Magical Pillar 
        const insightAttrs = enemyRules ? ['attunement'] : INSIGHT_ATTRIBUTES; 
        breakdown.resources.derived.insight = Math.floor(sumOf(finalStats, insightAttrs) * mults.insightPerAtt); 
        finalStats.insightRecovery += sumOf(finalStats, insightAttrs) * (enemyRules ? ENEMY_RECOVERY_PER_POINT : INSIGHT_RECOVERY_PER_ATT); 
        
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
        
        Object.values(equipment).forEach(item => { if (item) applyFlat(getEffectiveStats(item)); }); 
        const currentHp = character.hp ?? character.state?.stats?.hp ?? breakdown.resources.base.hp; 
        const currentMaxHp = breakdown.resources.base.hp + breakdown.resources.derived.hp + breakdown.resources.flat.hp; 
        
        traitList.forEach(trait => { 
            const def = typeof trait === 'string' ? TRAIT_DEFINITIONS[trait] : trait; 
            if (def?.stats) applyFlat(def.stats); 
            if (def?.conditionalStats && this.checkCondition(def.conditionalStats.condition, currentHp, currentMaxHp)) { 
                applyFlat(def.conditionalStats.stats); 
            } 
        }); 
        
        // --- STEP 4.25: WEAPON REQUIREMENTS --- 
        // A weapon whose requirements (items/weaponRequirements.js) the wielder does not meet cuts the wielder's attack in that weapon's damage types. 
        // Measured against the attributes after gear and traits, so a ring of Strength can carry a sword. 
        breakdown.unmetRequirements = []; 
        // (an enemy's gear written as a bare item id adds no stats here, its baseAttack already counts it, so it is not judged either) 
        Object.values(equipment).forEach(item => { 
            if (!item || typeof item !== 'object') return; 
            const unmet = unmetRequirements(requirementsOf(item), finalStats); 
            if (unmet.length === 0) return; 
            const eff = getEffectiveStats(item) || {}; 
            for (const t of Object.keys(eff.attack || {})) { 
                if (finalStats.attack[t] !== undefined) finalStats.attack[t] *= UNMET_REQUIREMENT_DAMAGE_SCALE; 
            } 
            breakdown.unmetRequirements.push({ item: eff.name || eff.id || item.defId, unmet }); 
        }); 

        // --- STEP 4.5: STATUS EFFECTS & STACKING --- 
        const activeStatuses = character.statusEffects || character.state?.statusEffects || []; 
        const flatModifiers = []; 
        const percentModifiers = []; 
        
        activeStatuses.forEach(status => { 
            if (!status.modifiers || !Array.isArray(status.modifiers)) return; 
            status.modifiers.forEach(mod => { 
                const stacks = status.stacks || 1; 
                const totalValue = mod.value * stacks; 
                if (mod.type === 'percent') { percentModifiers.push({ target: mod.target, value: totalValue }); } 
                else { flatModifiers.push({ target: mod.target, value: totalValue }); } 
            }); 
        }); 
        
        const applyMod = (mod, isPercent) => { 
            const path = mod.target.split('.'); 
            if (path.length === 2) { 
                const category = path[0]; 
                const stat = path[1]; 
                if (finalStats[category] && finalStats[category][stat] !== undefined) { 
                    if (isPercent) { finalStats[category][stat] += (finalStats[category][stat] * mod.value); } 
                    else { finalStats[category][stat] += mod.value; } 
                } 
            } else if (path.length === 1) { 
                const stat = path[0]; 
                if (finalStats[stat] !== undefined) { 
                    if (isPercent) { finalStats[stat] += (finalStats[stat] * mod.value); } 
                    else { finalStats[stat] += mod.value; } 
                } 
            } 
        }; 
        
        flatModifiers.forEach(mod => applyMod(mod, false)); 
        percentModifiers.forEach(mod => applyMod(mod, true)); 
        
        // --- STEP 5: FINAL SUMMATION --- 
        finalStats.maxHp = breakdown.resources.base.hp + breakdown.resources.derived.hp + breakdown.resources.flat.hp; 
        finalStats.maxStamina = breakdown.resources.base.stamina + breakdown.resources.derived.stamina + breakdown.resources.flat.stamina; 
        finalStats.maxInsight = breakdown.resources.base.insight + breakdown.resources.derived.insight + breakdown.resources.flat.insight; 
        // Whole numbers for every counted stat, hundredths for the rates (crit chance, crit multiplier, resistances): percent statuses and per-point
        // maths used to leave things like 4.9 stamina recovery or 12.4 defense on a character.
        for (const k of ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement', 'speed', 'accuracy', 'evasion', 'corruption', 'maxHp', 'maxStamina', 'maxInsight', 'hpRecovery', 'staminaRecovery', 'insightRecovery']) {
            if (typeof finalStats[k] === 'number') finalStats[k] = whole(finalStats[k]);
        }
        for (const k of ['attack', 'defense']) for (const t of Object.keys(finalStats[k] || {})) finalStats[k][t] = whole(finalStats[k][t]);
        for (const t of Object.keys(finalStats.resistance || {})) finalStats.resistance[t] = hundredths(finalStats.resistance[t]);
        finalStats.critChance = hundredths(finalStats.critChance);
        finalStats.critMultiplier = hundredths(finalStats.critMultiplier);
        finalStats.corruption = Math.max(0, Math.min(CORRUPTION.MAX, finalStats.corruption)); 
        
        // Corruption tiers (core/constants.js): while it is high enough, max health shrinks and magical damage grows. Nothing is stored, so they end when it drops. 
        // (the shackled faction's natural corruption, set by SpawnTableFactory, is a stat only: those enemies are tuned already, so no tier applies to them) 
        // (and none is felt before the story reveals corruption: act 2, CORRUPTION.REVEAL_ACT) 
        const tier = (combatSource.naturalCorruption || ActSystem.getAct() < CORRUPTION.REVEAL_ACT) ? null : this.corruptionTier(finalStats.corruption); 
        if (tier) { 
            if (tier.maxHpMultiplier !== undefined) finalStats.maxHp = Math.max(1, Math.floor(finalStats.maxHp * tier.maxHpMultiplier)); 
            if (tier.magicDamageBonus) MAGIC_DAMAGE_TYPES.forEach(t => { finalStats.attack[t] = whole(finalStats.attack[t] * (1 + tier.magicDamageBonus)); }); 
        } 
        finalStats.evasion = Math.max(1, finalStats.evasion); 
        finalStats.accuracy = Math.max(1, finalStats.accuracy); 
        
        return { finalStats, breakdown }; 
    } 

    /* The highest corruption tier a corruption value has reached (core/constants.js CORRUPTION.TIERS), or null. */ 
    static corruptionTier(corruption) { 
        let found = null; 
        for (const tier of CORRUPTION.TIERS) if (corruption >= tier.at && (!found || tier.at > found.at)) found = tier; 
        return found; 
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
            if (source.combat.corruption) stats.corruption += source.combat.corruption; 
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
