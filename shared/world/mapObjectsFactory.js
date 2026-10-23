import { MAP_OBJECTS_DEFINITIONS } from './mapObjectDefinitions.js';
import { MapObjectModel } from './mapObjectModel.js';

/*
 * A definition names its own sheet (a key of ASSET_MANIFEST):
 *     OAK_TREE_1: { sheet: 'objOakTree1', spriteX..., width: 3, height: 3, ... }
 * or, when the art differs per biome, a map keyed by biome id:
 *     SMALL_ROCKS_1: { sheet: { default: 'objSmallRocks1', DESERT: 'objSmallRocks1Desert' }, ... }
 * The factory resolves that to a single loader key and hands it to the model as `sheet`.
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
        // typeId is passed in, so the shared definition object is never written to.
        return new MapObjectModel(instanceId, col, row, definition, typeId, this.resolveSheet(definition, biome));
    }
}

export const mapObjectFactory = new MapObjectFactory();