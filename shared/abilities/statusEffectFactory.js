import { StatusEffectDefinitions } from './statusEffectDefinitions.js';
import { StatusEffectModel } from './statusEffectModel.js';

export class StatusEffectFactory {
    /** `level`: the level (1-3) a buff or debuff starts at (statusEffectDefinitions.js STATUS_LEVELS); 1 when not given, as the weather puts it on. */
    static createEffect(effectId, customCharges = null, inflictor = null, level = 1) {
        const def = StatusEffectDefinitions[effectId];
        if (!def) {
            console.warn(`[StatusEffectFactory] Unknown status effect ID: ${effectId}`);
            return null;
        }
        const effect = new StatusEffectModel(def, customCharges, inflictor);
        if (def.leveled && level > 1) effect.stacks = Math.min(effect.maxStacks, Math.floor(level));
        return effect;
    }
}