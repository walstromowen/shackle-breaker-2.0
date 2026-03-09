
export class CombatCalculator {

    static calculateDamage(attacker, defender, power = 1.0, damageType = 'blunt', abilityAccuracy = 1.0) { 
        const result = { hit: false, crit: false, damage: 0, message: "" };

        const attStats = attacker.stats || attacker.baseStats || {}; 
        const defStats = defender.stats || defender.baseStats || {};

        // --- 1. Hit Check ---
        const attackerAcc = attStats.accuracy || 100;
        const defenderEvasion = defStats.evasion || 100; 
        
        // Calculate raw chance, then cap at 95% maximum
        const rawHitChance = abilityAccuracy * (attackerAcc / defenderEvasion);
        const hitChance = Math.min(0.95, rawHitChance); 
        const hitRoll = Math.random();
        
        console.log(`[MATH DEBUG] Hit Check -> Acc:${abilityAccuracy} * (AtkAcc:${attackerAcc} / DefEva:${defenderEvasion}) = Raw ${(rawHitChance * 100).toFixed(1)}% | Capped: ${(hitChance * 100).toFixed(1)}% | Roll: ${(hitRoll * 100).toFixed(1)}% | Hit: ${hitRoll <= hitChance}`);

        if (hitRoll > hitChance) {
            result.message = "Missed!";
            return result; 
        }
        result.hit = true;

        // --- 2. Crit Check ---
        const critChance = attStats.critChance || 0.05;
        if (Math.random() < critChance) result.crit = true;

        // --- 3. Damage Calculation ---
        
        // YOUR STAT CALCULATOR ALREADY DID THE WORK! 
        // If damageType is 'fire', this automatically includes Intelligence.
        // If damageType is 'blunt', this automatically includes Strength.
        const attackVal = attacker.getAttack(damageType) || 0; 
        const defenseVal = defender.getDefense(damageType) || 0; 
        const resistanceVal = defStats.resistance?.[damageType] || 0;
        
        const a = attackVal * power;
        const r_modifier = 1 - resistanceVal;
        const d = defenseVal;

        let damage = (a * r_modifier) - d;

        console.log(`[MATH DEBUG] Damage (${damageType}) -> a:${a.toFixed(1)} (atk:${attackVal}*pwr:${power}) | r:${r_modifier.toFixed(2)} (res:${resistanceVal}) | d:${d} (def) || Formula: (${a.toFixed(1)} * ${r_modifier.toFixed(2)}) - ${d} = ${damage.toFixed(2)}`);

        // Apply Modifiers
        if (result.crit) {
            const multi = attStats.critMultiplier || 1.5;
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