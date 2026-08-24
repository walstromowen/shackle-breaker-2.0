// src/world/generators/factories/interiorFactory.js
import { INTERIOR_DEFINITIONS } from '../../../shared/data/interiorDefinitions.js';
import { HouseGenerator } from '../../generators/HouseGenerator.js';
import { CaveGenerator } from '../../generators/CaveGenerator.js';
import { CraftingHouseGenerator } from '../../generators/craftingHouseGenerator.js';

export class InteriorFactory {
    static create(seed, interiorType, interiorId) {
        const config = INTERIOR_DEFINITIONS[interiorType];

        if (!config) {
            console.warn(`[InteriorFactory] Unknown interior type: ${interiorType}. Falling back to default CAVE.`);
            return new CaveGenerator(seed, 'CAVE', INTERIOR_DEFINITIONS['CAVE'], interiorId);
        }

        switch (config.generatorType) {
            case 'HOUSE':
                return new HouseGenerator(seed, interiorType, config, interiorId);
            case 'CRAFTING_HOUSE':
                return new CraftingHouseGenerator(seed, interiorType, config, interiorId); // <-- Route to new generator
            case 'CAVE':
                return new CaveGenerator(seed, interiorType, config, interiorId);
            default:
                console.warn(`[InteriorFactory] Unknown generatorType: ${config.generatorType}. Falling back to HOUSE.`);
                return new CaveGenerator(seed, interiorType, INTERIOR_DEFINITIONS['HOUSE'], interiorId);
        }
    }
}