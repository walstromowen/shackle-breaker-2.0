import { MAP_OBJECTS_DEFINITIONS } from '../../data/mapObjectDefinitions.js';
import { MapObjectModel } from '../../models/mapObjectModel.js';

/*
 * A definition names its own sheet (a key of ASSET_MANIFEST):
 *     OAK_TREE_1: { sheet: 'objOakTree1', spriteX..., width: 3, height: 3, ... }
 * or, when the art differs per biome, a map keyed by biome id:
 *     SMALL_ROCKS_1: { sheet: { default: 'objSmallRocks1', DESERT: 'objSmallRocks1Desert' }, ... }
 * Definitions without `sheet` keep drawing from the biome's shared object sheet (objectSheetId + spriteX / spriteY).
 */
class MapObjectFactory {
    resolveSheet(definition, biome) {
        const s = definition.sheet;
        if (!s) return null;
        if (typeof s === 'string') return s;
        return (biome && s[biome.id]) || s.default || null;
    }

    create(typeId, col, row, biome) {
        const definition = MAP_OBJECTS_DEFINITIONS[typeId];
        if (!definition) return null;
        const instanceId = `proc_${col}_${row}`;
        // typeId is passed in, so the shared definition object is no longer written to.
        return new MapObjectModel(instanceId, col, row, definition, biome.objectSheetId, typeId, this.resolveSheet(definition, biome));
    }
}

export const mapObjectFactory = new MapObjectFactory();