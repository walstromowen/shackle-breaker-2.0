export class CombatCalculator {

    static calculateDamage(attacker, defender, power = 1.0, damageType = 'blunt', abilityAccuracy = 1.0) { 
        // REMOVED: message property from the initial result payload
        const result = { hit: false, crit: false, damage: 0 };

        const attStats = attacker.stats || attacker.baseStats || attacker.attributes || {}; 
        const defStats = defender.stats || defender.baseStats || defender.attributes || {};

        const safeType = damageType.toLowerCase();

        // --- 1. Hit Check ---
        const attackerAcc = attStats.accuracy ?? 100;
        const defenderEvasion = defStats.evasion ?? 100; 
        
        // Math.max ensures we never hit a division by zero error
        const rawHitChance = abilityAccuracy * (attackerAcc / Math.max(1, defenderEvasion));
        const hitChance = Math.min(0.95, rawHitChance); 
        const hitRoll = Math.random();
        
        console.log(`[MATH DEBUG] Hit Check -> Acc:${abilityAccuracy} * (AtkAcc:${attackerAcc} / DefEva:${defenderEvasion}) = Raw ${(rawHitChance * 100).toFixed(1)}% | Capped: ${(hitChance * 100).toFixed(1)}% | Roll: ${(hitRoll * 100).toFixed(1)}% | Hit: ${hitRoll <= hitChance}`);

        if (hitRoll > hitChance) {
            return result; // Cleanly return the miss data without assigning text
        }
        result.hit = true;

        // --- 2. Crit Check ---
        const critChance = attStats.critChance ?? 0.05;
        if (Math.random() < critChance) result.crit = true;

        // --- 3. Damage Calculation ---
        const attackVal = attacker.getAttack ? attacker.getAttack(safeType) : (attStats.attack?.[safeType] || 0); 
        const defenseVal = defender.getDefense ? defender.getDefense(safeType) : (defStats.defense?.[safeType] || 0); 
        const resistanceVal = defender.getResistance ? defender.getResistance(safeType) : (defStats.resistance?.[safeType] || 0);
        
        const a = attackVal * power;
        
        const r_modifier = Math.max(0, 1 - resistanceVal); 
        const d = defenseVal;

        let baseDamage = (a * r_modifier) - d;
        let damage = Math.max(1, baseDamage);

        console.log(`[MATH DEBUG] Damage (${safeType}) -> a:${a.toFixed(1)} (atk:${attackVal}*pwr:${power}) | r:${r_modifier.toFixed(2)} (res:${resistanceVal}) | d:${d} (def) || Formula: (${a.toFixed(1)} * ${r_modifier.toFixed(2)}) - ${d} = ${baseDamage.toFixed(2)}`);

        // Apply Modifiers
        if (result.crit) {
            const multi = attStats.critMultiplier ?? 1.5;
            damage *= multi;
            console.log(`[MATH DEBUG] CRITICAL HIT! (x${multi}) -> Raw Dmg: ${damage.toFixed(2)}`);
        }

        const variance = 0.9 + (Math.random() * 0.2); 
        damage *= variance;
        
        result.damage = Math.floor(Math.max(1, damage)); 
        console.log(`[MATH DEBUG] Final Damage (after variance x${variance.toFixed(2)}): ${result.damage}`);
        
        return result;
    }
}