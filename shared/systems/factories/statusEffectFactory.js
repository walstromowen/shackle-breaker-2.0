import { StatusEffectDefinitions } from '../../data/statusEffectDefinitions.js';
import { StatusEffectModel } from '../../models/statusEffectModel.js';

export class StatusEffectFactory {
    /**
     * Creates a new StatusEffectModel from a definition ID.
     * @param {string} effectId - The ID of the status (e.g., 'poison', 'frozen')
     * @param {number|null} customCharges - Optional override for how many charges it has
     * @param {Object|null} inflictor - The combatant who caused the effect
     * @returns {StatusEffectModel|null}
     */
    static createEffect(effectId, customCharges = null, inflictor = null) {
        const def = StatusEffectDefinitions[effectId];
        if (!def) {
            console.warn(`[StatusEffectFactory] Unknown status effect ID: ${effectId}`);
            return null;
        }
        return new StatusEffectModel(def, customCharges, inflictor);
    }
}