import { StatusEffectDefinitions } from '../../data/statusEffectDefinitions.js';
import { StatusEffectModel } from '../../models/statusEffectModel.js';

export class StatusEffectFactory {
    static createEffect(effectId, customCharges = null, inflictor = null) {
        const def = StatusEffectDefinitions[effectId];
        if (!def) {
            console.warn(`[StatusEffectFactory] Unknown status effect ID: ${effectId}`);
            return null;
        }
        return new StatusEffectModel(def, customCharges, inflictor);
    }
}