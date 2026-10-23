// shared/world/interiorFactory.js
import { INTERIOR_DEFINITIONS } from './interiorDefinitions.js';
import { HouseGenerator } from './generators/houseGenerator.js';
import { CaveGenerator } from './generators/caveGenerator.js';
import { CraftingHouseGenerator } from './generators/craftingHouseGenerator.js';

const GENERATORS = { HOUSE: HouseGenerator, CRAFTING_HOUSE: CraftingHouseGenerator, CAVE: CaveGenerator };

export class InteriorFactory {
    static create(seed, interiorType, interiorId) {
        let type = interiorType, config = INTERIOR_DEFINITIONS[type];

        if (!config) {
            // An unknown type used to turn into a cave, so a house door with a misspelt type dropped you into a cave. Fall back to a house (and say so loudly).
            console.error(`[InteriorFactory] Unknown interior type "${interiorType}": add it to interiorDefinitions.js. Using ABANDONED_HOUSE instead.`);
            type = 'ABANDONED_HOUSE';
            config = INTERIOR_DEFINITIONS[type];
        }

        const Generator = GENERATORS[config.generatorType];
        if (!Generator) throw new Error(`[InteriorFactory] ${type} has unknown generatorType "${config.generatorType}" (use HOUSE, CRAFTING_HOUSE or CAVE)`);
        return new Generator(seed, type, config, interiorId);
    }
}