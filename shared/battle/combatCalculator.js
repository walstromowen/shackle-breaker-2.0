// BALANCE KNOB: armor can blunt a hit but never cancel it. Whatever the defense, a hit still does at least this share of its damage (after resistance),
// and never less than 1. Without it, flat defense turned most enemy hits into a flat 1.
const MIN_DAMAGE_SHARE = 0.1;

// BALANCE KNOB: every ability hit in battle deals attack x power x this, before defense and resistance. Vigor gives twice the HP it used to, so hits
// had to grow with it: at 1.4 a level 1 Traveler kills a level 1 Madman in 2 to 3 Slashes (backend/test/scaling.test.js checks it).
// Encounter (out-of-battle) damage is written as raw numbers and does not use it. The ability preview (frontend/src/ui/abilityPreview.js) does.
export const DAMAGE_SCALE = 1.4;

// BALANCE KNOB: on top of DAMAGE_SCALE, the share of their damage that ENEMIES (the 'enemy' team in battle) deal. It grows with the enemy's level, so the
// game gets harder as it goes on: atLevel1 at level 1, + perLevel each level, never more than max (reached at about level 38). A party member's hits are
// never scaled by it. Tuned with tools/playthroughSim.mjs (100 simulated playthroughs of every starting class, solo, levels 1 to 50): a fight is won
// about 85% of the time early and about 70% by levels 40 to 50, and a player needs 3 to 6 attacks to kill an enemy all the way through.
export const ENEMY_DAMAGE = { atLevel1: 0.38, perLevel: 0.014, max: 0.9 };

/** The share of its damage an enemy of `level` deals (ENEMY_DAMAGE). */
export function enemyDamageScale(level = 1) {
    return Math.min(ENEMY_DAMAGE.max, ENEMY_DAMAGE.atLevel1 + ENEMY_DAMAGE.perLevel * (Math.max(1, level || 1) - 1));
}

/** The level of a combatant, an entity or a plain stat holder (1 when it has none). */
export const levelOf = (c) => (c && (c.originalEntity?.level ?? c.level ?? c.state?.level)) || 1;

export class CombatCalculator { 
    /** 
     * Pure math function to calculate mitigated damage. 
     * Shared by both the combat system and out-of-combat encounters. 
     */ 
    static calculateMitigatedDamage(rawDamage, defenseVal, resistanceVal, applyVariance = true) { 
        const r_modifier = Math.max(0, 1 - resistanceVal); 
        let baseDamage = (rawDamage * r_modifier) - defenseVal; 
        let damage = Math.max(1, rawDamage * r_modifier * MIN_DAMAGE_SHARE, baseDamage); 
        
        if (applyVariance) { 
            const variance = 0.9 + (Math.random() * 0.2); 
            damage *= variance; 
        } 
        
        return Math.floor(Math.max(1, damage)); 
    } 

    static calculateDamage(attacker, defender, power = 1.0, damageType = 'blunt', abilityAccuracy = 1.0) { 
        const result = { hit: false, crit: false, damage: 0 }; 
        const attStats = attacker.stats || attacker.baseStats || attacker.attributes || {}; 
        const defStats = defender.stats || defender.baseStats || defender.attributes || {}; 
        const safeType = damageType.toLowerCase(); 
        
        // --- 1. Hit Check --- 
        const attackerAcc = attStats.accuracy ?? 100; 
        const defenderEvasion = defStats.evasion ?? 100; 
        
        const rawHitChance = abilityAccuracy * (attackerAcc / Math.max(1, defenderEvasion)); 
        const hitChance = Math.min(0.95, rawHitChance); 
        const hitRoll = Math.random(); 
        
        console.log(`[MATH DEBUG] Hit Check -> Acc:${abilityAccuracy} * (AtkAcc:${attackerAcc} / DefEva:${defenderEvasion}) = Raw ${(rawHitChance * 100).toFixed(1)}% | Capped: ${(hitChance * 100).toFixed(1)}% | Roll: ${(hitRoll * 100).toFixed(1)}% | Hit: ${hitRoll <= hitChance}`); 
        
        if (hitRoll > hitChance) { 
            return result; 
        } 
        result.hit = true; 
        
        // --- 2. Crit Check --- 
        const critChance = attStats.critChance ?? 0.05; 
        if (Math.random() < critChance) result.crit = true; 
        
        // --- 3. Gather Initial Stats --- 
        const attackVal = attacker.getAttack ? attacker.getAttack(safeType) : (attStats.attack?.[safeType] || 0); 
        const defenseVal = defender.getDefense ? defender.getDefense(safeType) : (defStats.defense?.[safeType] || 0); 
        const resistanceVal = defender.getResistance ? defender.getResistance(safeType) : (defStats.resistance?.[safeType] || 0); 
        
        let rawDamage = attackVal * power * DAMAGE_SCALE * (attacker.team === 'enemy' ? enemyDamageScale(levelOf(attacker)) : 1); 
        
        if (result.crit) { 
            const multi = attStats.critMultiplier ?? 1.5; 
            rawDamage *= multi; 
            console.log(`[MATH DEBUG] CRITICAL HIT! (x${multi}) -> Raw Dmg: ${rawDamage.toFixed(2)}`); 
        } 
        
        // --- 4. Mitigation & Variance Pipeline --- 
        result.damage = this.calculateMitigatedDamage(rawDamage, defenseVal, resistanceVal, true); 
        console.log(`[MATH DEBUG] Final Mitigated Damage: ${result.damage}`); 
        
        return result; 
    } 
}