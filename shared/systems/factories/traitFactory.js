import { TRAIT_DEFINITIONS } from '../../data/traitDefinitions.js';

export class TraitFactory {
    /**
     * Converts an array of trait string IDs into an array of trait objects.
     * @param {string[]} traitIds - Array of strings (e.g. ['quick', 'iron_willed'])
     * @returns {Object[]} - Array of full trait definition objects
     */
    static createTraits(traitIds) {
        if (!Array.isArray(traitIds)) return [];

        return traitIds.reduce((acc, id) => {
            const definition = TRAIT_DEFINITIONS[id];
            if (definition) {
                // Return a deep clone to prevent accidental mutation of the base definitions
                acc.push({ 
                    id, // Inject the string ID into the object for reference
                    ...structuredClone(definition) 
                });
            } else {
                console.warn(`[TraitFactory] Trait definition not found for ID: ${id}`);
            }
            return acc;
        }, []);
    }
}