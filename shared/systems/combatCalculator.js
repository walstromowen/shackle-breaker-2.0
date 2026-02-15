import { StatCalculator } from './statCalculator.js';

export class CombatCalculator {

    /**
     * Calculates the raw outcome of a physical attack.
     * Does NOT modify the entities. Just returns the numbers.
     */
    static calculatePhysical(attacker, defender, power = 10, type = 'blunt') {
        const result = {
            hit: false,
            crit: false,
            damage: 0,
            message: ""
        };

        // 1. Get Stats (using your existing StatCalculator)
        // We use the 'combat' stats snapshot usually, but recalculating ensures accuracy
        const attStats = attacker.baseStats; 
        const defStats = defender.baseStats;

        // 2. Hit Check
        // Formula: Base Hit (95%) * (Accuracy / Evasion)
        // Using a simple standard RPG formula here
        const accuracy = attStats.accuracy || 100;
        const evasion = defStats.evasion || 100; // Prevent divide by zero
        const hitChance = 0.95 * (accuracy / evasion);

        if (Math.random() > hitChance) {
            result.message = "Missed!";
            return result; // hit is false by default
        }
        result.hit = true;

        // 3. Crit Check
        const critChance = attStats.critChance || 0.05;
        if (Math.random() < critChance) {
            result.crit = true;
        }

        // 4. Damage Calculation
        // Formula: (Attack * Power / Defense) * RandomVariance
        const attackVal = attacker.getAttack(type); // Uses your CombatantModel getter
        const defenseVal = defender.getDefense(type); // Uses your CombatantModel getter
        
        let damage = (attackVal * power) / Math.max(1, defenseVal);

        // Apply Crit Multiplier (1.5x standard)
        if (result.crit) {
            damage *= (attStats.critMultiplier || 1.5);
        }

        // Apply Variance (±10%)
        const variance = 0.9 + (Math.random() * 0.2); 
        damage *= variance;

        result.damage = Math.floor(Math.max(1, damage)); // Always deal at least 1 dmg
        
        return result;
    }

    /**
     * Calculates Magic/Elemental damage (Simpler: No miss check usually)
     */
    static calculateMagic(attacker, defender, power = 10, element = 'fire') {
        const result = { hit: true, crit: false, damage: 0, message: "" };
        
        const attStats = attacker.baseStats;
        
        // Magic Attack vs Resistance
        const magAtk = attStats.attributes.intelligence || 10;
        const magRes = defender.baseStats.resistance[element] || 0;

        // Simple subtraction formula for magic
        let damage = (magAtk + power) - (magRes / 2);
        
        // Crit check
        if (Math.random() < (attStats.critChance || 0.05)) {
            result.crit = true;
            damage *= 1.5;
        }

        result.damage = Math.floor(Math.max(0, damage));
        return result;
    }
}