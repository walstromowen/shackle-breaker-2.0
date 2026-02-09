import { AbilityDefinitions } from '../data/abilityDefinitions.js';
import { StatCalculator } from './statCalculator.js';
// import { CombatCalculator } from './combatCalculator.js'; 

export class AbilitySystem {

    /**
     * Executes an ability logic based on its defined effects.
     * @param {string} abilityId - The ID of the ability to use
     * @param {EntityModel} source - The entity using the ability
     * @param {EntityModel} target - The entity receiving the effect
     */
    static execute(abilityId, source, target) {
        const def = AbilityDefinitions[abilityId];
        if (!def) return { success: false, message: "Invalid Ability" };

        console.log(`[AbilitySystem] Executing: ${abilityId}`);

        const context = { success: false, messages: [], totalValue: 0 };

        if (def.effects && Array.isArray(def.effects)) {
            for (const effect of def.effects) {
                
                // --- HANDLER: RECOVER (Heal/Restore) ---
                if (effect.type === 'recover') {
                    const subResult = this._handleRecover(effect, source, target);
                    if (subResult.success) {
                        context.success = true;
                        context.messages.push(subResult.message);
                    }
                }
                
                // --- HANDLER: SET (New! For specific values like 1 HP) ---
                else if (effect.type === 'set') {
                    const subResult = this._handleSet(effect, target);
                    if (subResult.success) {
                        context.success = true;
                        context.messages.push(subResult.message);
                    }
                }
            }
        }

        if (context.success) {
            return {
                success: true,
                message: context.messages.join(", "),
                value: 0
            };
        }
        return { success: false, message: "No effect" };
    }

    // --- LOGIC HANDLERS ---

    static _handleRecover(effect, source, target) {
        let amount = 0;

        if (effect.calculation === 'flat') {
            amount = effect.power;
        } 
        else if (effect.calculation === 'attribute') {
            const stats = StatCalculator.calculate(source);
            amount = effect.power + Math.floor((stats.attributes[effect.attribute] || 0) * (effect.scaling || 0));
        }
        // NEW: Handle "Max" calculation (Fill to 100%)
        else if (effect.calculation === 'max') {
            amount = 9999; // EntityModel clamps this automatically
        }

        const actualChange = target.modifyResource(effect.resource, amount);

        if (actualChange !== 0) {
            return {
                success: true,
                message: `+${actualChange} ${effect.resource.toUpperCase()}`
            };
        }
        return { success: false };
    }

    static _handleSet(effect, target) {
        // 1. Get current value
        // We assume EntityModel has resources inside 'stats' or at root. 
        // Adjust this getter based on your specific EntityModel structure!
        const currentVal = target.stats ? target.stats[effect.resource] : target[effect.resource];

        // 2. Calculate difference to reach target value
        // Target: 1, Current: 100. Diff: -99
        const diff = effect.value - currentVal;

        if (diff === 0) return { success: false };

        // 3. Apply change
        target.modifyResource(effect.resource, diff);

        return {
            success: true,
            message: `${effect.resource.toUpperCase()} set to ${effect.value}`
        };
    }
}