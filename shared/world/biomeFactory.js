import { BIOME_DEFINITIONS } from './biomeDefinitions.js';
import { BiomeModel } from './biomeModel.js';

class BiomeFactory {
    constructor() {
        this._biomeCache = new Map();
    }

    /**
     * Retrieves or creates a BiomeModel by its ID.
     */
    getBiome(biomeId) {
        if (this._biomeCache.has(biomeId)) {
            return this._biomeCache.get(biomeId);
        }

        const definition = BIOME_DEFINITIONS[biomeId];
        if (!definition) {
            console.error(`[BiomeFactory] Biome definition '${biomeId}' not found. Falling back to PLAINS.`);
            return this.getBiome('PLAINS');
        }

        const biomeModel = new BiomeModel(definition);
        this._biomeCache.set(biomeId, biomeModel);

        return biomeModel;
    }

    /**
     * Picks the biome of a cell from one smooth noise field per biome: the highest field wins. Each biome therefore covers about a third of
     * the map as broad regions of its own. (Cutting a single field into low / middle / high would make the middle biome a thin band, a ring,
     * around the other two.) A small bonus lets the plains win close calls, since it is the biome the player starts in.
     */
    determineBiome(snowyField, plainsField, desertField) {
        const PLAINS_BONUS = 0.04;
        const plains = plainsField + PLAINS_BONUS;
        if (snowyField > plains && snowyField > desertField) return this.getBiome('SNOWY_MOUNTAINS');
        if (desertField > plains) return this.getBiome('DESERT');
        return this.getBiome('PLAINS');
    }
}

// Export as a singleton for easy access
export const biomeFactory = new BiomeFactory();