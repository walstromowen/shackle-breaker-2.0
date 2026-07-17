import { AbilityModel } from '../../models/abilityModel.js';
import { AbilityDefinitions } from '../../data/abilityDefinitions.js';

export class AbilityFactory {
    
    static createAbility(abilityId) {
        if (!AbilityDefinitions[abilityId]) {
            console.warn(`AbilityFactory: Warning! Ability ID "${abilityId}" not found. Defaulting to 'punch'.`);
            return new AbilityModel('punch');
        }
        return new AbilityModel(abilityId);
    }

    static createAbilities(abilityIds) {
        if (!Array.isArray(abilityIds)) return [];
        return abilityIds.map(id => this.createAbility(id));
    }

    static isItemAbility(abilityId) {
        const def = AbilityDefinitions[abilityId];
        return def && def.cost && def.cost.item !== undefined;
    }

    static getRegistryKeys() {
        return Object.keys(AbilityDefinitions);
    }
}