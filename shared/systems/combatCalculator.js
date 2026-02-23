import { StatCalculator } from './statCalculator.js';

export class CombatCalculator {

    static calculatePhysical(attacker, defender, power = 1.0, type = 'blunt', abilityAccuracy = 1.0) { 
        const result = { hit: false, crit: false, damage: 0, message: "" };

        const attStats = attacker.baseStats; 
        const defStats = defender.baseStats;

        // --- 1. Hit Check ---
        const attackerAcc = attStats.accuracy || 100;
        const defenderEvasion = defStats.evasion || 100; 
        const hitChance = abilityAccuracy * (attackerAcc / defenderEvasion);
        const hitRoll = Math.random();
        
        console.log(`[MATH DEBUG] Physical Hit Check -> Acc:${abilityAccuracy} * (AtkAcc:${attackerAcc} / DefEva:${defenderEvasion}) = ${(hitChance * 100).toFixed(1)}% | Roll: ${(hitRoll * 100).toFixed(1)}% | Hit: ${hitRoll <= hitChance}`);

        if (hitRoll > hitChance) {
            result.message = "Missed!";
            return result; 
        }
        result.hit = true;

        // --- 2. Crit Check ---
        const critChance = attStats.critChance || 0.05;
        if (Math.random() < critChance) result.crit = true;

        // --- 3. Damage Calculation ---
        const attackVal = attacker.getAttack(type) || 0; 
        const defenseVal = defender.getDefense(type) || 0; 
        const resistanceVal = defStats.resistance?.[type] || 0;
        
        const a = attackVal * power;
        const r_modifier = 1 - resistanceVal;
        const d = defenseVal;

        let damage = (a * r_modifier) - d;

        // Single-line breakdown for the raw formula
        console.log(`[MATH DEBUG] Physical Damage (${type}) -> a:${a.toFixed(1)} (atk:${attackVal}*pwr:${power}) | r:${r_modifier.toFixed(2)} (res:${resistanceVal}) | d:${d} (def) || Formula: (${a.toFixed(1)} * ${r_modifier.toFixed(2)}) - ${d} = ${damage.toFixed(2)}`);

        // Apply Modifiers
        if (result.crit) {
            const multi = attStats.critMultiplier || 1.5;
            damage *= multi;
            console.log(`[MATH DEBUG] CRITICAL HIT! (x${multi}) -> Raw Dmg: ${damage.toFixed(2)}`);
        }

        const variance = 0.9 + (Math.random() * 0.2); 
        damage *= variance;
        
        result.damage = Math.floor(Math.max(1, damage)); 
        console.log(`[MATH DEBUG] Final Physical Damage (after variance x${variance.toFixed(2)}): ${result.damage}`);
        
        return result;
    }

    static calculateMagic(attacker, defender, power = 1.0, element = 'fire', abilityAccuracy = 1.0) { 
        const result = { hit: false, crit: false, damage: 0, message: "" };
        
        const attStats = attacker.baseStats;
        const defStats = defender.baseStats;

        // --- 1. Hit Check ---
        const attackerAcc = attStats.accuracy || 100;
        const defenderEvasion = defStats.evasion || 100; 
        const hitChance = abilityAccuracy * (attackerAcc / defenderEvasion);
        const hitRoll = Math.random();
        
        console.log(`[MATH DEBUG] Magic Hit Check -> Acc:${abilityAccuracy} * (AtkAcc:${attackerAcc} / DefEva:${defenderEvasion}) = ${(hitChance * 100).toFixed(1)}% | Roll: ${(hitRoll * 100).toFixed(1)}% | Hit: ${hitRoll <= hitChance}`);

        if (hitRoll > hitChance) {
            result.message = "Missed!";
            return result;
        }
        result.hit = true;
        
        // --- 2. Damage Calculation ---
        const magAtk = attStats.attributes?.intelligence || 10;
        const resistanceVal = defStats.resistance?.[element] || 0;
        const defenseVal = defender.getDefense(element) || 0;

        const a = magAtk * power;
        const r_modifier = 1 - resistanceVal;
        const d = defenseVal;

        let damage = (a * r_modifier) - d;

        // Single-line breakdown for the raw formula
        console.log(`[MATH DEBUG] Magic Damage (${element}) -> a:${a.toFixed(1)} (matk:${magAtk}*pwr:${power}) | r:${r_modifier.toFixed(2)} (res:${resistanceVal}) | d:${d} (def) || Formula: (${a.toFixed(1)} * ${r_modifier.toFixed(2)}) - ${d} = ${damage.toFixed(2)}`);
        
        // --- 3. Crit Check & Modifiers ---
        if (Math.random() < (attStats.critChance || 0.05)) {
            result.crit = true;
            const multi = attStats.critMultiplier || 1.5;
            damage *= multi;
            console.log(`[MATH DEBUG] MAGIC CRIT! (x${multi}) -> Raw Dmg: ${damage.toFixed(2)}`);
        }

        const variance = 0.9 + (Math.random() * 0.2); 
        damage *= variance;
        
        result.damage = Math.floor(Math.max(1, damage)); 
        console.log(`[MATH DEBUG] Final Magic Damage (after variance x${variance.toFixed(2)}): ${result.damage}`);

        return result;
    }
}