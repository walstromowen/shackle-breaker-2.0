export class CombatCalculator {

    /**
     * @param {Object} attacker 
     * @param {Object} defender 
     * @param {Object} ability 
     */
    static calculateAttack(attacker, defender, ability) {
        const attStats = attacker.stats;
        
        // --- 1. HANDLE MULTIPLE EFFECTS ---
        // If the ability has a complex 'effects' array, use that.
        // Otherwise, normalize the simple ability into a single effect.
        const effects = ability.effects || [{
            resource: 'hp',             // Default target
            type: ability.damageType || 'blunt',
            power: ability.power || 1.0,
            useDefense: true            // Default: Armor applies
        }];

        const results = [];

        for (const effect of effects) {
            // A. Calculate Raw Power
            const rawPool = attStats.attack[effect.type] || 0;
            let rawDamage = rawPool * effect.power;

            // B. Apply Crit (Applies to all parts of the attack usually)
            const isCrit = Math.random() < attStats.critChance;
            if (isCrit) rawDamage *= attStats.critMultiplier;

            // C. Process Mitigation
            const result = this.processDamage(defender, rawDamage, effect.type, {
                useDefense: effect.useDefense !== false, // Default true
                targetResource: effect.resource
            });

            results.push(result);
        }

        return results;
    }

    /**
     * Universal Mitigation Calculator
     * @param {Object} defender 
     * @param {Number} incomingDamage 
     * @param {String} type (fire, blunt, etc)
     * @param {Object} options { useDefense: boolean, targetResource: string }
     */
    static processDamage(defender, incomingDamage, type, options = {}) {
        const defStats = defender.stats;
        const useDefense = options.useDefense !== false; // Default true
        
        let currentDamage = incomingDamage;

        // --- STEP 1: DEFENSE (Optional) ---
        // Insight/Stamina damage often ignores thick armor.
        if (useDefense) {
            const defenseStat = defStats.defense[type] || 0;
            const ARMOR_SCALING = 100;
            const mitigation = ARMOR_SCALING / (ARMOR_SCALING + defenseStat);
            currentDamage *= mitigation;
        }

        // --- STEP 2: RESISTANCE (Always applied?) ---
        // Fire Resistance should probably help against "Fire Stamina Drain"
        const resStat = defStats.resistance[type] || 0;
        const resistanceMultiplier = 1 - (resStat / 100);
        
        currentDamage *= resistanceMultiplier;

        // --- FINAL CLAMP ---
        // Allow 0 damage if it's a secondary resource (like stamina)
        const minDamage = options.targetResource === 'hp' ? 1 : 0;
        
        const finalAmount = Math.floor(Math.max(minDamage, currentDamage));

        return {
            resource: options.targetResource || 'hp',
            amount: finalAmount,
            type: type
        };
    }
}