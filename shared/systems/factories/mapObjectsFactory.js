import { MAP_OBJECTS_DEFINITIONS } from '../../data/mapObjectDefinitions.js';
import { MapObjectModel } from '../../models/mapObjectModel.js';

class MapObjectFactory {
    create(typeId, col, row, biome) {
        const definition = MAP_OBJECTS_DEFINITIONS[typeId];
        if (!definition) return null;

        // Temporarily inject the typeId so the model can capture it
        definition.id = typeId;

        const instanceId = `proc_${col}_${row}`;
        return new MapObjectModel(instanceId, col, row, definition, biome.objectSheetId);
    }
}

export const mapObjectFactory = new MapObjectFactory();