import { StatusEffectDefinitions } from './statusEffectDefinitions.js';
import { StatusEffectModel } from './statusEffectModel.js';

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