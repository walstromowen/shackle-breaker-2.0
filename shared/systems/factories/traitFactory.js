import { TRAIT_DEFINITIONS } from '../../data/traitDefinitions.js';

export class TraitFactory {
    static createTraits(traitIds) {
        if (!Array.isArray(traitIds)) return [];
        return traitIds.reduce((acc, id) => {
            const definition = TRAIT_DEFINITIONS[id];
            if (definition) {
                acc.push({ id, ...structuredClone(definition) });
            } else {
                console.warn(`[TraitFactory] Trait definition not found for ID: ${id}`);
            }
            return acc;
        }, []);
    }
}