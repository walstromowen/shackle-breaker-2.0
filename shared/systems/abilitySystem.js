import { AbilityDefinitions } from '../data/abilityDefinitions.js';
import { StatCalculator } from './statCalculator.js';
import { CombatCalculator } from './combatCalculator.js'; 

export class AbilitySystem {

    /**
     * Executes an ability logic and returns a standard CombatResult object.
     * @param {string} abilityId 
     * @param {EntityModel} source 
     * @param {EntityModel} target 
     * @returns {CombatResult}
     */
    static execute(abilityId, source, target) {
        const def = AbilityDefinitions[abilityId];
        if (!def) return { success: false, message: "Invalid Ability" };

        // 1. Initialize the Standard Contract Object
        const result = {
            success: false,
            outcome: 'NONE',   // 'HIT', 'MISS', 'CRIT', 'HEAL'
            delta: 0,          // The raw numerical change (negative for dmg)
            resource: 'hp',    // The resource affected
            message: "",       // Text log
            addedTags: []      // Status effects applied
        };

        if (def.effects && Array.isArray(def.effects)) {
            for (const effect of def.effects) {
                
                // --- HANDLER: DAMAGE (Connected to Calculator) ---
                if (effect.type === 'damage') {
                    const calc = this._handleDamage(effect, source, target);
                    
                    // Update the Result Object
                    result.success = calc.hit;
                    result.outcome = calc.crit ? 'CRIT' : (calc.hit ? 'HIT' : 'MISS');
                    result.delta = -calc.damage; // Damage is a negative change
                    result.message = calc.message;

                    // If a main attack misses, we usually stop processing effects
                    if (!calc.hit) break; 
                }

                // --- HANDLER: RECOVER (Heal/Restore) ---
                else if (effect.type === 'recover') {
                    const subResult = this._handleRecover(effect, source, target);
                    if (subResult.success) {
                        result.success = true;
                        result.outcome = 'HEAL';
                        result.delta = subResult.amount;
                        result.resource = effect.resource;
                        result.message = subResult.message;
                    }
                }
                
                // --- HANDLER: SET (Utility) ---
                else if (effect.type === 'set') {
                    const subResult = this._handleSet(effect, target);
                    if (subResult.success) {
                        result.success = true;
                        result.message = subResult.message;
                    }
                }
            }
        }

        // Fallback message if one wasn't generated
        if (result.success && !result.message) {
            result.message = "Ability used successfully.";
        } else if (!result.success && !result.message) {
            result.message = "But it failed!";
        }

        return result;
    }

    // --- LOGIC HANDLERS ---

    static _handleDamage(effect, source, target) {
        // 1. Ask the Calculator for the numbers (No state change yet)
        const calc = CombatCalculator.calculatePhysical(
            source, 
            target, 
            effect.power || 10,
            effect.damageType || 'blunt'
        );

        // 2. Apply the State Change (Mutation)
        if (calc.hit) {
            target.modifyResource('hp', -calc.damage);

            // 3. Generate the Text Log
            const critText = calc.crit ? " (Critical!)" : "";
            calc.message = `${target.name} takes ${calc.damage} damage!${critText}`;
        } else {
            calc.message = `${source.name}'s attack missed!`;
        }

        return calc;
    }

    static _handleRecover(effect, source, target) {
        let amount = 0;

        if (effect.calculation === 'flat') {
            amount = effect.power;
        } 
        else if (effect.calculation === 'attribute') {
            const stats = StatCalculator.calculate(source);
            amount = effect.power + Math.floor((stats.attributes[effect.attribute] || 0) * (effect.scaling || 0));
        }
        else if (effect.calculation === 'max') {
            amount = 9999; 
        }

        const actualChange = target.modifyResource(effect.resource, amount);

        return {
            success: actualChange !== 0,
            amount: actualChange,
            message: actualChange !== 0 ? `+${actualChange} ${effect.resource.toUpperCase()}` : "Recover failed"
        };
    }

    static _handleSet(effect, target) {
        const currentVal = target.stats ? target.stats[effect.resource] : target[effect.resource];
        const diff = effect.value - currentVal;

        if (diff === 0) return { success: false };

        target.modifyResource(effect.resource, diff);

        return {
            success: true,
            message: `${effect.resource.toUpperCase()} set to ${effect.value}`
        };
    }
}