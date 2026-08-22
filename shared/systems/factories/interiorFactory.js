// src/world/factories/InteriorFactory.js

import { INTERIOR_DEFINITIONS } from '../../data/interiorDefinitions.js';
import { HouseGenerator } from '../../generators/houseGenerator.js';  
import { CaveGenerator } from '../../generators/caveGenerator.js';

export class InteriorFactory {
    static create(seed, type, interiorId) {
        // Fallback to abandoned house if a definition isn't found
        const definition = INTERIOR_DEFINITIONS[type] || INTERIOR_DEFINITIONS.ABANDONED_HOUSE;
        
        switch (definition.generatorType) {
            case 'HOUSE':
                return new HouseGenerator(seed, type, definition, interiorId);
            case 'CAVE':
                return new CaveGenerator(seed, type, definition, interiorId);
            default:
                console.error(`Unknown generator type: ${definition.generatorType}`);
                return new HouseGenerator(seed, type, definition, interiorId);
        }
    }
}