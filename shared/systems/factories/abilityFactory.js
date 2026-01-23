/**
 * shared/systems/factories/abilityFactory.js
 * * The manufacturing plant for abilities.
 * * This wraps "new AbilityModel()" with safety checks and data validation.
 */

import { AbilityModel } from '../../models/abilityModel.js';     
import { AbilityDefinitions } from '../../data/abilityDefinitions.js';

export class AbilityFactory {

    /**
     * Creates a single ready-to-use Ability instance.
     * @param {string} abilityId - The unique ID from AbilityDefinitions (e.g., "punch", "bite")
     * @returns {AbilityModel}
     */
    static createAbility(abilityId) {
        // 1. Safety Check: Does this ID exist?
        if (!AbilityDefinitions[abilityId]) {
            console.warn(`AbilityFactory: Warning! Ability ID "${abilityId}" not found. Defaulting to 'punch'.`);
            // Fallback to 'punch' as it is the most basic, guaranteed safe move
            return new AbilityModel('punch');
        }

        // 2. Create the Instance
        return new AbilityModel(abilityId);
    }

    /**
     * Helper to create a list of abilities (e.g., when initializing a Monster).
     * @param {string[]} abilityIds - Array of IDs ["bite", "scratch"]
     * @returns {AbilityModel[]}
     */
    static createAbilities(abilityIds) {
        if (!Array.isArray(abilityIds)) return [];
        
        return abilityIds.map(id => this.createAbility(id));
    }

    /**
     * Determines if an ID belongs to a Consumable Item or a Standard Skill.
     * Useful for UI sorting (Skills vs Items tab).
     * @param {string} abilityId 
     */
    static isItemAbility(abilityId) {
        const def = AbilityDefinitions[abilityId];
        // Checks if the cost object exists and has an 'item' property
        return def && def.cost && def.cost.item !== undefined;
    }

    /**
     * Debug Helper: Returns all registered ability IDs.
     */
    static getRegistryKeys() {
        return Object.keys(AbilityDefinitions);
    }
}